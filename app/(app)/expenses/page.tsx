import { createClient } from '@/lib/supabase/server';
import { ExpensesClient } from './ExpensesClient';
import { getRates, convertAmount, type Currency } from '@/lib/currency';
import { getSubscription } from '@/lib/subscription';
import { getCurrentWorkspace } from '@/lib/workspace';

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

  let expenses: Array<Record<string, unknown>> = [];
  let archiveYears: ArchiveYear[] = [];

  const ctx = await getCurrentWorkspace();

  const [{ data: categories }, { data: settings }, { data: contactsRaw }, rates, subscription] = await Promise.all([
    supabase.from('categories').select('*').eq('workspace_id', ctx.workspaceId).order('name'),
    supabase.from('user_settings').select('default_currency').single(),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone, user_id')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at'),
    getRates(),
    getSubscription(),
  ]);

  // Calculamos `is_self` desde la perspectiva del viewer: solo es "Yo" si
  // el contacto pertenece al user actual. Los selfs de otros miembros del
  // workspace aparecen como contactos normales (sin el sufijo "(Vos)").
  type RawContact = { id: string; name: string; relationship: string; is_self: boolean; phone: string | null; user_id: string | null };
  const contacts = ((contactsRaw ?? []) as RawContact[])
    .map((c) => ({
      ...c,
      is_self: !!c.is_self && c.user_id === ctx.userId,
    }))
    .sort((a, b) => {
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const userCurrency = ((settings as { default_currency?: string } | null)?.default_currency ?? 'ARS') as Currency;
  const displayCurrency = (params.asCurrency ?? userCurrency) as Currency;

  // --- Vista archive: agregamos por año --------------------------------
  if (view === 'archive') {
    const { data: all } = await supabase
      .from('expenses')
      .select('id, amount, currency, expense_date')
      .eq('workspace_id', ctx.workspaceId)
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
  } else {
    // Vista month o all
    let query = supabase
      .from('expenses')
      .select('*, categories(id, name, icon, color)')
      .eq('workspace_id', ctx.workspaceId);

    if (view === 'month') {
      const [y, m] = monthStr.split('-').map(Number) as [number, number];
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12
        ? `${y + 1}-01-01`
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      query = query.gte('expense_date', monthStart).lt('expense_date', nextMonth);
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

    // Cargo splits + nombres de contactos para los expenses visibles.
    const expIds = (expenses as Array<{ id: string }>).map((e) => e.id);
    if (expIds.length > 0) {
      const { data: splitRows } = await supabase
        .from('expense_splits')
        .select('expense_id, contact_id, amount, percentage, notification_contacts(name)')
        .in('expense_id', expIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = ((splitRows ?? []) as any[]);
      const map = new Map<string, Array<{ contact_id: string; contact_name: string; amount: number | null; percentage: number | null }>>();
      for (const r of rows) {
        const list = map.get(r.expense_id) ?? [];
        list.push({
          contact_id: r.contact_id,
          contact_name: r.notification_contacts?.name ?? '—',
          amount: r.amount,
          percentage: r.percentage,
        });
        map.set(r.expense_id, list);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expenses = (expenses as any[]).map((e) => ({ ...e, _splits: map.get(e.id) ?? [] }));
    }
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
      isPro={subscription.tier === 'pro'}
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
};

export default ExpensesPage;
