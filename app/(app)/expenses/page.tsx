import { createClient } from '@/lib/supabase/server';
import { ExpensesClient } from './ExpensesClient';
import { getRates, type Currency } from '@/lib/currency';

export type ExpensesView = 'month' | 'all';

type SearchParams = {
  view?: string;
  month?: string;
  q?: string;
  cat?: string;     // category IDs separados por coma
  from?: string;    // YYYY-MM-DD
  to?: string;      // YYYY-MM-DD
  min?: string;
  max?: string;
  paid?: string;    // 'paid' | 'pending' | undefined (all)
  rec?: string;     // 'recurring' | 'one-time' | undefined
  cur?: string;     // currency filtrada (filtro)
  asCurrency?: string; // moneda en la que se muestra el TOTAL
  sort?: string;    // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const view: ExpensesView = params.view === 'all' ? 'all' : 'month';

  const monthStr = params.month ?? new Date().toISOString().slice(0, 7);

  // --- Construcción de query según el view ---------------------------
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

  // Sort
  const sort = params.sort ?? 'date-desc';
  if (sort === 'date-asc') query = query.order('expense_date', { ascending: true });
  else if (sort === 'amount-desc') query = query.order('amount', { ascending: false });
  else if (sort === 'amount-asc') query = query.order('amount', { ascending: true });
  else query = query.order('expense_date', { ascending: false });

  // En vista "Todos" sin filtros, limitar a 200 para no explotar
  if (view === 'all') query = query.limit(200);

  const [{ data: expenses }, { data: categories }, { data: settings }, { data: contacts }, rates] = await Promise.all([
    query,
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

  return (
    <ExpensesClient
      view={view}
      monthStr={monthStr}
      expenses={expenses ?? []}
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
        sort,
      }}
    />
  );
}
