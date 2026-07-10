import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendPush, type PushSubscriptionRow } from '@/lib/push/server';

type GeneratedRow = {
  g_id: string;
  g_user_id: string;
  g_workspace_id: string;
  g_description: string | null;
  g_amount: number;
  g_currency: string;
  g_kind: 'expense' | 'income';
  g_expense_date: string;
};

const handler = async (req: Request) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('generate_recurring_expenses');
  if (error) {
    console.error('[cron/recurring] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as GeneratedRow[];
  const generated = rows.length;

  // Notificaciones push por gastos/ingresos recurrentes recién generados.
  let notified = 0;
  if (generated > 0) {
    const rowsByUser = new Map<string, GeneratedRow[]>();
    for (const r of rows) {
      const list = rowsByUser.get(r.g_user_id) ?? [];
      list.push(r);
      rowsByUser.set(r.g_user_id, list);
    }
    const userIds = [...rowsByUser.keys()];

    const [{ data: settingsRaw }, { data: pushRaw }] = await Promise.all([
      supabase.from('user_settings').select('user_id, notify_recurring').in('user_id', userIds),
      supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', userIds),
    ]);

    const notifyRecurring = new Map(
      ((settingsRaw ?? []) as { user_id: string; notify_recurring: boolean }[]).map((s) => [
        s.user_id,
        s.notify_recurring,
      ]),
    );
    const pushByUser = new Map<string, PushSubscriptionRow[]>();
    for (const p of (pushRaw ?? []) as (PushSubscriptionRow & { user_id: string })[]) {
      const list = pushByUser.get(p.user_id) ?? [];
      list.push({ id: p.id, endpoint: p.endpoint, p256dh: p.p256dh, auth: p.auth });
      pushByUser.set(p.user_id, list);
    }

    const stalePushIds: string[] = [];

    for (const [userId, userRows] of rowsByUser) {
      // Opt-out: solo saltamos si el usuario apagó el toggle explícitamente.
      if (notifyRecurring.get(userId) === false) continue;

      const subs = pushByUser.get(userId) ?? [];
      if (subs.length === 0) continue;

      const expenseRows = userRows.filter((r) => r.g_kind !== 'income');
      const incomeRows = userRows.filter((r) => r.g_kind === 'income');
      const noun =
        incomeRows.length === 0 ? 'gasto' : expenseRows.length === 0 ? 'ingreso' : 'movimiento';

      const single = userRows.length === 1 ? userRows[0] : undefined;
      const body = single
        ? `Se registró tu ${single.g_kind === 'income' ? 'ingreso' : 'gasto'} recurrente: ${
            single.g_description ?? (single.g_kind === 'income' ? 'Ingreso' : 'Gasto')
          } · ${single.g_amount} ${single.g_currency}`
        : `Se registraron ${userRows.length} ${noun}s recurrentes de este período`;

      const payload = {
        title: 'Recurrentes al día · Kumo',
        body,
        url: '/expenses',
        tag: 'recurring',
      };

      let anyOk = false;
      for (const sub of subs) {
        const res = await sendPush(sub, payload);
        if (res.ok) anyOk = true;
        else if (res.gone) stalePushIds.push(sub.id);
      }
      if (anyOk) notified++;
    }

    if (stalePushIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', stalePushIds);
    }
  }

  return NextResponse.json({ generated, notified });
};

export const POST = handler;
export const GET = handler;
