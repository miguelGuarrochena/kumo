import { createClient } from '@/lib/supabase/server';
import { ExpensesClient } from './ExpensesClient';
import { getRates, convertAmount, type Currency } from '@/lib/currency';
import { getSubscription } from '@/lib/subscription';
import { getPricing } from '@/lib/pricing';
import { findRecurringCandidates, type ExpenseRecurringRow } from '@/lib/recurringSuggest';
import { getCurrentWorkspace } from '@/lib/workspace';
import { EXPENSES_PAGE_SIZE, clampPage, pageRange } from '@/lib/pagination';
import type { BalanceRow, PaymentRow } from '../split/types';

export type ExpensesView = 'month' | 'all' | 'archive';

export type ArchiveYear = {
  year: number;
  total: number; // ya convertido a displayCurrency
  count: number;
};

export type ExpenseListSummary = {
  totalCount: number;
  totalInDisplay: number; // total de gastos (kind = 'expense')
  incomeInDisplay: number; // total de ingresos (kind = 'income')
  netInDisplay: number; // ingresos − gastos
  hasIncome: boolean;
  someRateMissing: boolean;
  currencyBreakdown: { currency: string; count: number }[];
};

type SearchParams = {
  view?: string;
  month?: string;
  q?: string;
  cat?: string;
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  paid?: string;
  rec?: string;
  cur?: string;
  kind?: string;
  asCurrency?: string;
  sort?: string;
  section?: string;
  page?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyExpenseFilters = (
  query: any,
  view: ExpensesView,
  monthStr: string,
  params: SearchParams,
) => {
  // El filtro por tipo (gasto/ingreso) aplica en todas las vistas.
  if (params.kind === 'expense') query = query.eq('kind', 'expense');
  if (params.kind === 'income') query = query.eq('kind', 'income');

  if (view === 'month') {
    const [y, m] = monthStr.split('-').map(Number) as [number, number];
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return query.gte('expense_date', monthStart).lt('expense_date', nextMonth);
  }
  if (params.from) query = query.gte('expense_date', params.from);
  if (params.to) query = query.lte('expense_date', params.to);
  if (params.cat) {
    const ids = params.cat.split(',').filter(Boolean);
    if (ids.length > 0) query = query.in('category_id', ids);
  }
  if (params.paid === 'paid') query = query.eq('paid', true);
  if (params.paid === 'pending') query = query.eq('paid', false);
  if (params.rec === 'recurring') query = query.eq('is_recurring', true);
  if (params.rec === 'one-time') query = query.eq('is_recurring', false);
  if (params.cur) query = query.eq('currency', params.cur);
  if (params.min) query = query.gte('amount', Number(params.min));
  if (params.max) query = query.lte('amount', Number(params.max));
  if (params.q) query = query.ilike('description', `%${params.q}%`);
  return query;
};

const applyExpenseSort = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort: string,
) => {
  if (sort === 'date-asc') return query.order('expense_date', { ascending: true });
  if (sort === 'amount-desc') return query.order('amount', { ascending: false });
  if (sort === 'amount-asc') return query.order('amount', { ascending: true });
  return query.order('expense_date', { ascending: false });
};

const ExpensesPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const supabase = await createClient();
  const params = await searchParams;
  const view: ExpensesView =
    params.view === 'all' ? 'all' :
    params.view === 'archive' ? 'archive' :
    'month';

  const monthStr = params.month ?? new Date().toISOString().slice(0, 7);
  const section = params.section === 'saldos' ? 'saldos' : 'gastos';

  let expenses: Array<Record<string, unknown>> = [];
  let archiveYears: ArchiveYear[] = [];
  let expensePage = 1;
  let expenseSummary: ExpenseListSummary = {
    totalCount: 0,
    totalInDisplay: 0,
    incomeInDisplay: 0,
    netInDisplay: 0,
    hasIncome: false,
    someRateMissing: false,
    currencyBreakdown: [],
  };

  const ctx = await getCurrentWorkspace();

  const [
    { data: categories },
    { data: settings },
    { data: contactsRaw },
    rates,
    subscription,
    balancesRes,
    { data: paymentsRaw },
  ] = await Promise.all([
    supabase.from('categories').select('*').eq('workspace_id', ctx.workspaceId).order('name'),
    supabase.from('user_settings').select('default_currency').single(),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone, mp_alias, mp_payment_link, user_id, is_split_only')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at'),
    getRates(),
    getSubscription(),
    supabase.rpc('workspace_balances', { ws_id: ctx.workspaceId }),
    supabase
      .from('payments')
      .select('id, from_contact_id, to_contact_id, amount, currency, note, paid_at')
      .eq('workspace_id', ctx.workspaceId)
      .order('paid_at', { ascending: false }),
  ]);

  const balances = (balancesRes?.data ?? []) as BalanceRow[];
  const payments = (paymentsRaw ?? []) as PaymentRow[];

  // Calculamos `is_self` desde la perspectiva del viewer: solo es "Yo" si
  // el contacto pertenece al user actual. Los selfs de otros miembros del
  // workspace aparecen como contactos normales (sin el sufijo "(Vos)").
  type RawContact = {
    id: string;
    name: string;
    relationship: string;
    is_self: boolean;
    phone: string | null;
    mp_alias: string | null;
    mp_payment_link: string | null;
    user_id: string | null;
    is_split_only: boolean;
  };
  const contacts = ((contactsRaw ?? []) as RawContact[])
    .map((c) => ({
      ...c,
      is_self: !!c.is_self && c.user_id === ctx.userId,
    }))
    .sort((a, b) => {
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      if (a.is_split_only !== b.is_split_only) return a.is_split_only ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

  const userCurrency = ((settings as { default_currency?: string } | null)?.default_currency ?? 'ARS') as Currency;
  const displayCurrency = (params.asCurrency ?? userCurrency) as Currency;

  // --- Vista archive / listado de gastos (omitido en tab Saldos) ------------
  if (section !== 'saldos' && view === 'archive') {
    const { data: all } = await supabase
      .from('expenses')
      .select('id, amount, currency, expense_date')
      .eq('workspace_id', ctx.workspaceId)
      .eq('kind', 'expense')
      .order('expense_date', { ascending: false });

    type Mini = { id: string; amount: number; currency: string; expense_date: string };
    const byYear = new Map<number, { total: number; count: number }>();
    for (const e of (all ?? []) as Mini[]) {
      const year = Number(e.expense_date.slice(0, 4));
      const amount = Number(e.amount);
      const converted = convertAmount(amount, e.currency as Currency, displayCurrency, rates.rates);
      const entry = byYear.get(year) ?? { total: 0, count: 0 };
      // Si falta la tasa, no sumamos 0: ignoramos el monto del total pero
      // seguimos contando el gasto.
      if (converted !== null) entry.total += converted;
      entry.count += 1;
      byYear.set(year, entry);
    }

    archiveYears = Array.from(byYear.entries())
      .map(([year, { total, count }]) => ({ year, total, count }))
      .sort((a, b) => b.year - a.year);
  } else if (section !== 'saldos') {
    const sort = params.sort ?? 'date-desc';
    const base = applyExpenseFilters(
      supabase.from('expenses').select('amount, currency, kind').eq('workspace_id', ctx.workspaceId),
      view,
      monthStr,
      params,
    );
    const { data: summaryRows } = await applyExpenseSort(base, sort);

    type Mini = { amount: number; currency: string; kind?: 'expense' | 'income' };
    const counts = new Map<string, number>();
    let totalInDisplay = 0;
    let incomeInDisplay = 0;
    let hasIncome = false;
    let someRateMissing = false;
    for (const row of (summaryRows ?? []) as Mini[]) {
      counts.set(row.currency, (counts.get(row.currency) ?? 0) + 1);
      const isIncome = row.kind === 'income';
      if (isIncome) hasIncome = true;
      const converted = convertAmount(
        Number(row.amount),
        row.currency as Currency,
        displayCurrency,
        rates.rates,
      );
      if (converted === null) someRateMissing = true;
      else if (isIncome) incomeInDisplay += converted;
      else totalInDisplay += converted;
    }

    const totalCount = summaryRows?.length ?? 0;
    expensePage = clampPage(Number(params.page) || 1, totalCount, EXPENSES_PAGE_SIZE);
    const { from, to } = pageRange(expensePage, EXPENSES_PAGE_SIZE);

    let listQuery = applyExpenseFilters(
      supabase.from('expenses').select('*, categories(id, name, icon, color)').eq('workspace_id', ctx.workspaceId),
      view,
      monthStr,
      params,
    );
    listQuery = applyExpenseSort(listQuery, sort);
    const { data } = await listQuery.range(from, to);
    expenses = data ?? [];

    expenseSummary = {
      totalCount,
      totalInDisplay,
      incomeInDisplay,
      netInDisplay: incomeInDisplay - totalInDisplay,
      hasIncome,
      someRateMissing,
      currencyBreakdown: Array.from(counts.entries())
        .map(([currency, count]) => ({ currency, count }))
        .sort((a, b) => b.count - a.count),
    };

    // Cargo splits + nombres de contactos para los expenses visibles.
    const expIds = (expenses as Array<{ id: string }>).map((e) => e.id);
    if (expIds.length > 0) {
      const { data: splitRows } = await supabase
        .from('expense_splits')
        .select('expense_id, contact_id, amount, percentage, paid, notification_contacts(name)')
        .in('expense_id', expIds);

      type SplitRow = {
        expense_id: string;
        contact_id: string;
        amount: number | null;
        percentage: number | null;
        paid: boolean;
        notification_contacts: { name: string } | null;
      };
      const rows = (splitRows ?? []) as unknown as SplitRow[];
      const map = new Map<string, Array<{ contact_id: string; contact_name: string; amount: number | null; percentage: number | null; paid: boolean }>>();
      for (const r of rows) {
        const list = map.get(r.expense_id) ?? [];
        list.push({
          contact_id: r.contact_id,
          contact_name: r.notification_contacts?.name ?? '—',
          amount: r.amount,
          percentage: r.percentage,
          paid: !!r.paid,
        });
        map.set(r.expense_id, list);
      }
      expenses = expenses.map((e) => ({ ...e, _splits: map.get(e.id as string) ?? [] }));
    }
  }

  const pricing = getPricing();

  let recurringSuggestions: ReturnType<typeof findRecurringCandidates> = [];
  if (section !== 'saldos') {
    const since = new Date();
    since.setDate(since.getDate() - 180);
    const { data: recurringHistory } = await supabase
      .from('expenses')
      .select('id, description, amount, expense_date, is_recurring')
      .eq('workspace_id', ctx.workspaceId)
      .eq('kind', 'expense')
      .gte('expense_date', since.toISOString().slice(0, 10))
      .not('description', 'is', null)
      .order('expense_date', { ascending: false })
      .limit(300);
    recurringSuggestions = findRecurringCandidates(
      (recurringHistory ?? []) as ExpenseRecurringRow[],
    );
  }

  return (
    <ExpensesClient
      section={section}
      expensesDataLoaded={section !== 'saldos'}
      view={view}
      monthStr={monthStr}
      expenses={expenses as never}
      expensePage={expensePage}
      expensePageSize={EXPENSES_PAGE_SIZE}
      expenseSummary={expenseSummary}
      archiveYears={archiveYears}
      categories={categories ?? []}
      contacts={contacts ?? []}
      balances={balances}
      payments={payments}
      defaultCurrency={userCurrency}
      displayCurrency={displayCurrency}
      rates={rates.rates}
      hasOcrAccess={subscription.hasOcr}
      hasWa={subscription.hasWa}
      trialDaysLeft={subscription.daysLeftInTrial}
      pricing={pricing}
      recurringSuggestions={recurringSuggestions}
      filters={{
        q: params.q ?? '',
        cat: params.cat?.split(',').filter(Boolean) ?? [],
        from: params.from ?? '',
        to: params.to ?? '',
        min: params.min ?? '',
        max: params.max ?? '',
        paid: (params.paid ?? '') as '' | 'paid' | 'pending',
        rec: (params.rec ?? '') as '' | 'recurring' | 'one-time',
        cur: params.cur ?? '',
        kind: (params.kind ?? '') as '' | 'expense' | 'income',
        sort: params.sort ?? 'date-desc',
      }}
    />
  );
};

export default ExpensesPage;
