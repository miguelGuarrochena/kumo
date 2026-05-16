import { createClient } from '@/lib/supabase/server';
import { ExpensesClient } from './ExpensesClient';
import { getRates, type Currency } from '@/lib/currency';

export type ExpensesView = 'month' | 'all' | 'archive';

export type ArchiveYear = {
  year: number;
  total: number; // ya convertido a displayCurrency
  count: number;
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
  asCurrency?: string;
  sort?: string;
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const view: ExpensesView =
    params.view === 'all' ? 'all' :
    params.view === 'archive' ? 'archive' :
    'month';

  const monthStr = params.month ?? new Date().toISOString().slice(0, 7);

  let expenses: Array<Record<string, unknown>> = [];
  let archiveYears: ArchiveYear[] = [];

  // Carga de catálogos comunes
  const [{ data: categories }, { data: settings }, { data: contacts }, rates] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('user_settings').select('default_currency').single(),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone')
      .order('created_at'),
    getRates(),
  ]);

  const userCurrency = (settings?.default_currency ?? 'ARS') as Currency;
  const displayCurrency = (params.asCurrency ?? userCurrency) as Currency;

  // --- Vista archive: agregamos por año --------------------------------
  if (view === 'archive') {
    const { data: all } = await supabase
      .from('expenses')
      .select('id, amount, currency, expense_date')
      .order('expense_date', { ascending: false });

    const byYear = new Map<number, { total: number; count: number }>();
    for (const e of all ?? []) {
      const year = Number(e.expense_date.slice(0, 4));
      const amount = Number(e.amount);
      const converted = convertCurrency(amount, e.currency as Currency, displayCurrency, rates.rates);
      const entry = byYear.get(year) ?? { total: 0, count: 0 };
      entry.total += converted;
      entry.count += 1;
      byYear.set(year, entry);
    }

    archiveYears = Array.from(byYear.entries())
      .map(([year, { total, count }]) => ({ year, total, count }))
      .sort((a, b) => b.year - a.year);
  } else {
    // Vista month o all
    let query = supabase
      .from('expenses')
      .select('*, categories(id, name, icon, color)');

    if (view === 'month') {
      const monthStart = `${monthStr}-01`;
      const monthEnd = `${monthStr}-31`;
      query = query.gte('expense_date', monthStart).lte('expense_date', monthEnd);
    } else {
      // Filtros para vista "Todos"
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
    }

    const sort = params.sort ?? 'date-desc';
    if (sort === 'date-asc') query = query.order('expense_date', { ascending: true });
    else if (sort === 'amount-desc') query = query.order('amount', { ascending: false });
    else if (sort === 'amount-asc') query = query.order('amount', { ascending: true });
    else query = query.order('expense_date', { ascending: false });

    if (view === 'all') query = query.limit(200);

    const { data } = await query;
    expenses = data ?? [];
  }

  return (
    <ExpensesClient
      view={view}
      monthStr={monthStr}
      expenses={expenses as never}
      archiveYears={archiveYears}
      categories={categories ?? []}
      contacts={contacts ?? []}
      defaultCurrency={userCurrency}
      displayCurrency={displayCurrency}
      rates={rates.rates}
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
        sort: params.sort ?? 'date-desc',
      }}
    />
  );
}

function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Partial<Record<Currency, number>>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return 0;
  return (amount / fromRate) * toRate;
}
