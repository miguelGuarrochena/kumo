// Endpoint que corre el "loop de notificaciones".
// Llamado por un cron (Supabase pg_cron, Vercel Cron, o uptime monitor).
// Auth: header Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppAdapter } from '@/lib/notifications/whatsapp';
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

  const today = new Date().toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

  const { data: dueExpensesRaw } = await supabase
    .from('expenses')
    .select('id, user_id, amount, currency, description, due_date, notify_contact_ids')
    .eq('paid', false)
    .gte('due_date', today)
    .lte('due_date', in3Days);
  const dueExpenses = (dueExpensesRaw ?? []) as Expense[];

  const { data: remindersRaw } = await supabase
    .from('reminders')
    .select('id, user_id, title, reminder_date, reminder_type, notify_days_before, last_notified_at, notify_contact_ids')
    .gte('reminder_date', today);
  const reminders = (remindersRaw ?? []) as Reminder[];

  const allUserIds = new Set<string>([
    ...dueExpenses.map((e) => e.user_id),
    ...reminders.map((r) => r.user_id),
  ]);

  const [{ data: contactsRaw }, { data: settingsRaw }] = await Promise.all([
    supabase
      .from('notification_contacts')
      .select('*')
      .in('user_id', [...allUserIds]),
    supabase.from('user_settings').select('*').in('user_id', [...allUserIds]),
  ]);

  const contacts = (contactsRaw ?? []) as Contact[];
  const settings = (settingsRaw ?? []) as Settings[];

  const contactsById = new Map<string, Contact>(contacts.map((c) => [c.id, c]));
  const settingsByUser = new Map<string, Settings>(settings.map((s) => [s.user_id, s]));
  const selfContactByUser = new Map<string, Contact>(
    contacts.filter((c) => c.is_self).map((c) => [c.user_id, c]),
  );

  const wa = getWhatsAppAdapter();

  function resolveRecipients(userId: string, contactIds: string[]): { id: string; name: string; phone: string }[] {
    let pool: Contact[] = [];

    if (contactIds.length > 0) {
      pool = contactIds
        .map((id) => contactsById.get(id))
        .filter((c): c is Contact => !!c);
    } else {
      const self = selfContactByUser.get(userId);
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
          relationship: 'self',
          is_self: true,
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

    const recipients = resolveRecipients(exp.user_id, exp.notify_contact_ids ?? []);
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    for (const r of recipients) {
      const result = await wa.send({
        to: r.phone,
        title: '🌥️ Vencimiento próximo · Kumo',
        body: `${exp.description ?? 'Gasto'} vence el ${exp.due_date}.\nMonto: ${exp.amount} ${exp.currency}`,
        ref: { type: 'expense', id: exp.id },
      });
      result.ok ? sent++ : failed++;
    }
  }

  for (const rem of reminders) {
    const userSettings = settingsByUser.get(rem.user_id);
    if (userSettings && !userSettings.notify_reminders) {
      skipped++;
      continue;
    }

    const reminderDate = new Date(rem.reminder_date);
    const diffDays = Math.ceil((reminderDate.getTime() - Date.now()) / 86400_000);
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

    const recipients = resolveRecipients(rem.user_id, rem.notify_contact_ids ?? []);
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    const emoji =
      rem.reminder_type === 'medical'  ? '🏥' :
      rem.reminder_type === 'birthday' ? '🎂' :
      '🔔';

    let anyOk = false;
    for (const r of recipients) {
      const selfPhone = selfContactByUser.get(rem.user_id)?.phone;
      const isOwner = r.phone === selfPhone;
      const greeting = isOwner ? '' : `Hola ${r.name}, te aviso de parte de Kumo: `;

      const result = await wa.send({
        to: r.phone,
        title: `${emoji} ${rem.title} · Kumo`,
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

    if (anyOk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('reminders') as any)
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', rem.id);
    }
  }

  return NextResponse.json({ sent, failed, skipped });
}
