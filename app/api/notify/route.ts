import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tryGetWhatsAppAdapter } from '@/lib/notifications/whatsapp';
import { sendPush, type PushSubscriptionRow } from '@/lib/push/server';
import { todayKey, toIsoLocal, daysBetween, dayKey } from '@/lib/date';
import { subscriptionRowHasWa } from '@/lib/subscription';
import type { Database } from '@/lib/supabase/database.types';

type Contact = Database['public']['Tables']['notification_contacts']['Row'];
type Settings = Database['public']['Tables']['user_settings']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type Reminder = Database['public']['Tables']['reminders']['Row'];

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const today = todayKey();
  const in3Days = toIsoLocal((() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  })());

  const { data: dueExpensesRaw } = await supabase
    .from('expenses')
    .select('id, user_id, workspace_id, amount, currency, description, due_date, notify_contact_ids')
    .eq('paid', false)
    .gte('due_date', today)
    .lte('due_date', in3Days);
  const dueExpenses = (dueExpensesRaw ?? []) as Expense[];

  const { data: remindersRaw } = await supabase
    .from('reminders')
    .select('id, user_id, workspace_id, title, reminder_date, reminder_type, notify_days_before, last_notified_at, notify_contact_ids')
    .gte('reminder_date', today);
  const reminders = (remindersRaw ?? []) as Reminder[];

  const allUserIds = new Set<string>([
    ...dueExpenses.map((e) => e.user_id),
    ...reminders.map((r) => r.user_id),
  ]);

  const [{ data: contactsRaw }, { data: settingsRaw }, { data: pushRaw }, { data: subsRaw }] =
    await Promise.all([
      supabase
        .from('notification_contacts')
        .select('*')
        .in('user_id', [...allUserIds]),
      supabase.from('user_settings').select('*').in('user_id', [...allUserIds]),
      supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', [...allUserIds]),
      supabase
        .from('subscriptions')
        .select('user_id, status, trial_ends_at, current_period_end, provider_subscription_id, plan_type')
        .in('user_id', [...allUserIds]),
    ]);

  type SubRow = {
    user_id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    provider_subscription_id: string | null;
    plan_type: string | null;
  };
  const waAccessByUser = new Map<string, boolean>(
    ((subsRaw ?? []) as SubRow[]).map((s) => [s.user_id, subscriptionRowHasWa(s)]),
  );

  const pushByUser = new Map<string, PushSubscriptionRow[]>();
  for (const p of (pushRaw ?? []) as (PushSubscriptionRow & { user_id: string })[]) {
    const arr = pushByUser.get(p.user_id) ?? [];
    arr.push({ id: p.id, endpoint: p.endpoint, p256dh: p.p256dh, auth: p.auth });
    pushByUser.set(p.user_id, arr);
  }

  const stalePushIds: string[] = [];
  const pushToUser = async (userId: string, payload: { title: string; body: string; url: string; tag: string }) => {
    const list = pushByUser.get(userId) ?? [];
    for (const p of list) {
      const r = await sendPush(p, payload);
      if (!r.ok) {
        if (r.gone) stalePushIds.push(p.id);
        failed++;
      } else {
        sent++;
      }
    }
  };

  const contacts = (contactsRaw ?? []) as Contact[];
  const settings = (settingsRaw ?? []) as Settings[];

  const contactsById = new Map<string, Contact>(contacts.map((c) => [c.id, c]));
  const settingsByUser = new Map<string, Settings>(settings.map((s) => [s.user_id, s]));
  const selfKey = (userId: string, workspaceId: string) => `${userId}::${workspaceId}`;
  const selfContactByUser = new Map<string, Contact>(
    contacts.filter((c) => c.is_self).map((c) => [selfKey(c.user_id, c.workspace_id), c]),
  );

  const wa = tryGetWhatsAppAdapter();
  let waSkipped = 0;

  function resolveRecipients(userId: string, workspaceId: string, contactIds: string[]): { id: string; name: string; phone: string }[] {
    let pool: Contact[] = [];

    if (contactIds.length > 0) {
      pool = contactIds
        .map((id) => contactsById.get(id))
        .filter((c): c is Contact => !!c);
    } else {
      const self = selfContactByUser.get(selfKey(userId, workspaceId));
      const settingsRow = settingsByUser.get(userId);
      if (self?.phone) {
        pool = [self];
      } else if (settingsRow?.whatsapp_number) {
        pool = [{
          id: 'legacy',
          user_id: userId,
          workspace_id: '',
          name: 'Yo',
          phone: settingsRow.whatsapp_number,
          mp_alias: null,
          mp_payment_link: null,
          relationship: 'self',
          is_self: true,
          is_split_only: false,
          verified: false,
          created_at: new Date().toISOString(),
        }];
      }
    }

    return pool
      .filter((c) => !!c.phone)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone! }));
  }

  for (const exp of dueExpenses) {
    const userSettings = settingsByUser.get(exp.user_id);
    if (userSettings && !userSettings.notify_expenses) {
      skipped++;
      continue;
    }

    const title = 'Vencimiento próximo · Kumo';
    const body = `${exp.description ?? 'Gasto'} vence el ${exp.due_date}. Monto: ${exp.amount} ${exp.currency}`;

    await pushToUser(exp.user_id, { title, body, url: '/expenses', tag: `exp-${exp.id}` });

    const recipients = resolveRecipients(exp.user_id, exp.workspace_id, exp.notify_contact_ids ?? []);
    const userHasWa = waAccessByUser.get(exp.user_id) ?? false;
    if (!wa || !userHasWa) {
      waSkipped += recipients.length;
    } else {
      for (const r of recipients) {
        const result = await wa.send({
          to: r.phone,
          title,
          body: `${exp.description ?? 'Gasto'} vence el ${exp.due_date}.\nMonto: ${exp.amount} ${exp.currency}`,
          ref: { type: 'expense', id: exp.id },
        });
        result.ok ? sent++ : failed++;
      }
    }
  }

  for (const rem of reminders) {
    const userSettings = settingsByUser.get(rem.user_id);
    if (userSettings && !userSettings.notify_reminders) {
      skipped++;
      continue;
    }

    const diffDays = daysBetween(today, dayKey(rem.reminder_date));
    if (diffDays > rem.notify_days_before) {
      skipped++;
      continue;
    }

    if (rem.last_notified_at) {
      const lastNotif = new Date(rem.last_notified_at);
      const sameDay = lastNotif.toDateString() === new Date().toDateString();
      if (sameDay) {
        skipped++;
        continue;
      }
    }

    const when = diffDays === 0 ? 'hoy' : diffDays === 1 ? 'mañana' : `en ${diffDays} días`;
    await pushToUser(rem.user_id, {
      title: `${rem.title} · Kumo`,
      body: `Es ${when} (${rem.reminder_date})`,
      url: '/calendar',
      tag: `rem-${rem.id}`,
    });

    const recipients = resolveRecipients(rem.user_id, rem.workspace_id, rem.notify_contact_ids ?? []);
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    const prefix =
      rem.reminder_type === 'medical'  ? 'Turno médico' :
      rem.reminder_type === 'birthday' ? 'Cumpleaños' :
      'Recordatorio';

    let anyOk = false;
    const userHasWa = waAccessByUser.get(rem.user_id) ?? false;
    if (!wa || !userHasWa) {
      waSkipped += recipients.length;
    } else {
      for (const r of recipients) {
        const selfPhone = selfContactByUser.get(selfKey(rem.user_id, rem.workspace_id))?.phone;
        const isOwner = r.phone === selfPhone;
        const greeting = isOwner ? '' : `Hola ${r.name}, te aviso de parte de Kumo: `;

        const result = await wa.send({
          to: r.phone,
          title: `${prefix} · ${rem.title} · Kumo`,
          body: `${greeting}Es ${diffDays === 0 ? 'hoy' : diffDays === 1 ? 'mañana' : `en ${diffDays} días`} (${rem.reminder_date})`,
          ref: { type: 'reminder', id: rem.id },
        });
        if (result.ok) {
          anyOk = true;
          sent++;
        } else {
          failed++;
        }
      }
    }

    if (anyOk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('reminders') as any)
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', rem.id);
    }
  }

  if (stalePushIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', stalePushIds);
  }

  return NextResponse.json({
    sent,
    failed,
    skipped,
    waSkipped,
    whatsapp: wa ? 'active' : 'disabled',
    stalePush: stalePushIds.length,
  });
}
