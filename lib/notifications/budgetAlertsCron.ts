import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getRates, type Currency } from '@/lib/currency';
import {
  computeSpend,
  currentBudgetMonthKey,
  pickBudgetAlertThreshold,
  type BudgetAlertThreshold,
} from '@/lib/budgets';
import { sendPush, type PushSubscriptionRow } from '@/lib/push/server';

type BudgetRow = {
  id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
};

type ExpenseRow = {
  workspace_id: string;
  amount: number;
  currency: string;
  category_id: string | null;
};

const fmtAmount = (n: number, currency: string): string =>
  `${currency} ${Math.round(n).toLocaleString('es-AR')}`;

const buildAlertCopy = (
  threshold: BudgetAlertThreshold,
  label: string,
  spent: number,
  cap: number,
  currency: string,
): { title: string; body: string } => {
  const pct = Math.round((spent / cap) * 100);
  const spentStr = fmtAmount(spent, currency);
  const capStr = fmtAmount(cap, currency);

  if (threshold === '100') {
    return {
      title: `Te pasaste del presupuesto · Kumo`,
      body: `${label}: ${spentStr} de ${capStr} (${pct}%)`,
    };
  }
  return {
    title: `Presupuesto al ${pct}% · Kumo`,
    body: `${label}: ${spentStr} de ${capStr}`,
  };
};

/**
 * Evalúa presupuestos del mes y manda push a miembros del workspace con
 * `notify_expenses` activo. Registra envíos en `budget_alerts_sent`.
 */
export async function runBudgetAlerts(
  supabase: SupabaseClient<Database>,
): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  const month = currentBudgetMonthKey();
  const monthStart = `${month}-01`;

  const { data: budgetsRaw } = await supabase
    .from('budgets')
    .select('id, workspace_id, category_id, amount, currency');

  const budgets = (budgetsRaw ?? []) as BudgetRow[];
  if (budgets.length === 0) return { sent, skipped };

  const workspaceIds = [...new Set(budgets.map((b) => b.workspace_id))];

  const [
    { data: expensesRaw },
    { data: sentRaw },
    { data: membersRaw },
    { data: categoriesRaw },
    { data: settingsRaw },
    { data: pushRaw },
    ratesSnap,
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('workspace_id, amount, currency, category_id')
      .in('workspace_id', workspaceIds)
      .eq('kind', 'expense')
      .gte('expense_date', monthStart),
    supabase
      .from('budget_alerts_sent')
      .select('budget_id, threshold')
      .eq('month', month),
    supabase
      .from('workspace_members')
      .select('workspace_id, user_id')
      .in('workspace_id', workspaceIds),
    supabase
      .from('categories')
      .select('id, name')
      .in('workspace_id', workspaceIds),
    supabase.from('user_settings').select('user_id, notify_expenses'),
    supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth'),
    getRates(),
  ]);

  const expensesByWs = new Map<string, ExpenseRow[]>();
  for (const e of (expensesRaw ?? []) as ExpenseRow[]) {
    const list = expensesByWs.get(e.workspace_id) ?? [];
    list.push(e);
    expensesByWs.set(e.workspace_id, list);
  }

  const sentByBudget = new Map<string, Set<BudgetAlertThreshold>>();
  for (const row of (sentRaw ?? []) as { budget_id: string; threshold: BudgetAlertThreshold }[]) {
    const set = sentByBudget.get(row.budget_id) ?? new Set();
    set.add(row.threshold);
    sentByBudget.set(row.budget_id, set);
  }

  const membersByWs = new Map<string, string[]>();
  for (const m of (membersRaw ?? []) as { workspace_id: string; user_id: string }[]) {
    const list = membersByWs.get(m.workspace_id) ?? [];
    list.push(m.user_id);
    membersByWs.set(m.workspace_id, list);
  }

  const categoryName = new Map(
    ((categoriesRaw ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  const notifyExpenses = new Map(
    ((settingsRaw ?? []) as { user_id: string; notify_expenses: boolean }[]).map((s) => [
      s.user_id,
      s.notify_expenses,
    ]),
  );

  const pushByUser = new Map<string, PushSubscriptionRow[]>();
  for (const p of (pushRaw ?? []) as (PushSubscriptionRow & { user_id: string })[]) {
    const list = pushByUser.get(p.user_id) ?? [];
    list.push({ id: p.id, endpoint: p.endpoint, p256dh: p.p256dh, auth: p.auth });
    pushByUser.set(p.user_id, list);
  }

  for (const budget of budgets) {
    const cap = Number(budget.amount);
    if (cap <= 0) {
      skipped++;
      continue;
    }

    const currency = budget.currency as Currency;
    const wsExpenses = expensesByWs.get(budget.workspace_id) ?? [];
    const { spent, rateMissing } = computeSpend(
      wsExpenses,
      budget.category_id,
      currency,
      ratesSnap.rates,
    );

    if (rateMissing) {
      skipped++;
      continue;
    }

    const pct = spent / cap;
    const alreadySent = sentByBudget.get(budget.id) ?? new Set();
    const threshold = pickBudgetAlertThreshold(pct, alreadySent);
    if (!threshold) {
      skipped++;
      continue;
    }

    const label = budget.category_id
      ? (categoryName.get(budget.category_id) ?? 'Categoría')
      : 'Total del mes';

    const { title, body } = buildAlertCopy(threshold, label, spent, cap, currency);
    const tag = `budget-${budget.id}-${threshold}-${month}`;
    const members = membersByWs.get(budget.workspace_id) ?? [];

    let anyPush = false;
    for (const userId of members) {
      if (notifyExpenses.get(userId) === false) continue;
      const subs = pushByUser.get(userId) ?? [];
      if (subs.length === 0) continue;

      for (const sub of subs) {
        const r = await sendPush(sub, { title, body, url: '/budgets', tag });
        if (r.ok) {
          sent++;
          anyPush = true;
        }
      }
    }

    if (anyPush) {
      await supabase.from('budget_alerts_sent').insert({
        budget_id: budget.id,
        month,
        threshold,
      });
      alreadySent.add(threshold);
      sentByBudget.set(budget.id, alreadySent);
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}
