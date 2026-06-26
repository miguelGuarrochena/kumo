import { createClient } from '@/lib/supabase/server';
import { MetricsClient } from './MetricsClient';
import { getRates, type Currency } from '@/lib/currency';
import { getCurrentWorkspace } from '@/lib/workspace';
import { todayKey } from '@/lib/date';

export type MetricsPeriod = 'day' | 'week' | 'month' | 'year';

type SearchParams = {
  period?: string;
  date?: string;
  asCurrency?: string;
  scope?: 'current' | 'all';
};

const MetricsPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const params = await searchParams;

  const scope = params.scope === 'all' ? 'all' : 'current';
  const { data: { user } } = await supabase.auth.getUser();

  // Cuántos espacios tiene este user (para mostrar el toggle solo si hay >1).
  const { count: workspaceCount } = await supabase
    .from('workspace_members')
    .select('workspace_id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '');

  const period: MetricsPeriod = (['day', 'week', 'month', 'year'].includes(params.period ?? '')
    ? (params.period as MetricsPeriod)
    : 'month');

  const refDate = params.date ?? todayKey();
  const { start, end, prevStart, prevEnd } = computeRange(period, refDate);

  // Para "evolución temporal" cargamos hasta 12 períodos hacia atrás (sin filtrar paid)
  const trailStart = computeTrailStart(period, refDate, 12);

  const [
    { data: currentExpenses },
    { data: previousExpenses },
    { data: trailExpenses },
    { data: currentIncome },
    { data: previousIncome },
    { data: settings },
    rates,
  ] = await Promise.all([
    (() => {
      let q = supabase
        .from('expenses')
        .select('id, amount, currency, expense_date, description, category_id, categories(name, color)')
        .eq('kind', 'expense')
        .gte('expense_date', start)
        .lte('expense_date', end);
      if (scope === 'current') q = q.eq('workspace_id', ctx.workspaceId);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('expenses')
        .select('id, amount, currency, expense_date')
        .eq('kind', 'expense')
        .gte('expense_date', prevStart)
        .lte('expense_date', prevEnd);
      if (scope === 'current') q = q.eq('workspace_id', ctx.workspaceId);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('expenses')
        .select('id, amount, currency, expense_date')
        .eq('kind', 'expense')
        .gte('expense_date', trailStart)
        .lte('expense_date', end);
      if (scope === 'current') q = q.eq('workspace_id', ctx.workspaceId);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('expenses')
        .select('id, amount, currency, expense_date')
        .eq('kind', 'income')
        .gte('expense_date', start)
        .lte('expense_date', end);
      if (scope === 'current') q = q.eq('workspace_id', ctx.workspaceId);
      return q;
    })(),
    (() => {
      let q = supabase
        .from('expenses')
        .select('id, amount, currency, expense_date')
        .eq('kind', 'income')
        .gte('expense_date', prevStart)
        .lte('expense_date', prevEnd);
      if (scope === 'current') q = q.eq('workspace_id', ctx.workspaceId);
      return q;
    })(),
    supabase.from('user_settings').select('default_currency').single(),
    getRates(),
  ]);

  const userCurrency = ((settings as { default_currency?: string } | null)?.default_currency ?? 'ARS') as Currency;
  const displayCurrency = (params.asCurrency ?? userCurrency) as Currency;

  return (
    <MetricsClient
      period={period}
      refDate={refDate}
      range={{ start, end, prevStart, prevEnd }}
      currentExpenses={(currentExpenses ?? []) as never}
      previousExpenses={(previousExpenses ?? []) as never}
      trailExpenses={(trailExpenses ?? []) as never}
      currentIncome={(currentIncome ?? []) as never}
      previousIncome={(previousIncome ?? []) as never}
      defaultCurrency={userCurrency}
      displayCurrency={displayCurrency}
      rates={rates.rates}
      scope={scope}
      showScopeToggle={(workspaceCount ?? 1) > 1}
    />
  );
};

export default MetricsPage;

// ---------------------------------------------------------------------
// Cálculo de rangos
// ---------------------------------------------------------------------
function computeRange(period: MetricsPeriod, refDateStr: string) {
  const ref = new Date(refDateStr + 'T12:00:00');
  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  if (period === 'day') {
    start = end = new Date(ref);
    prevStart = prevEnd = addDays(ref, -1);
  } else if (period === 'week') {
    // semana ISO (lunes a domingo)
    const day = ref.getDay() || 7;
    start = addDays(ref, -(day - 1));
    end = addDays(start, 6);
    prevStart = addDays(start, -7);
    prevEnd = addDays(start, -1);
  } else if (period === 'month') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    prevStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    prevEnd = new Date(ref.getFullYear(), ref.getMonth(), 0);
  } else {
    // year
    start = new Date(ref.getFullYear(), 0, 1);
    end = new Date(ref.getFullYear(), 11, 31);
    prevStart = new Date(ref.getFullYear() - 1, 0, 1);
    prevEnd = new Date(ref.getFullYear() - 1, 11, 31);
  }

  return {
    start: toIso(start),
    end: toIso(end),
    prevStart: toIso(prevStart),
    prevEnd: toIso(prevEnd),
  };
}

function computeTrailStart(period: MetricsPeriod, refDateStr: string, count: number): string {
  const ref = new Date(refDateStr + 'T12:00:00');
  let d: Date;
  if (period === 'day') d = addDays(ref, -count + 1);
  else if (period === 'week') d = addDays(ref, -(count - 1) * 7);
  else if (period === 'month') d = new Date(ref.getFullYear(), ref.getMonth() - (count - 1), 1);
  else d = new Date(ref.getFullYear() - (count - 1), 0, 1);
  return toIso(d);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
