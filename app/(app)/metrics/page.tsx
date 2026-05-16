import { createClient } from '@/lib/supabase/server';
import { MetricsClient } from './MetricsClient';
import { getRates, type Currency } from '@/lib/currency';

export type MetricsPeriod = 'day' | 'week' | 'month' | 'year';

type SearchParams = {
  period?: string;
  date?: string; // YYYY-MM-DD — fecha de referencia, default hoy
  asCurrency?: string;
};

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const period: MetricsPeriod = (['day', 'week', 'month', 'year'].includes(params.period ?? '')
    ? (params.period as MetricsPeriod)
    : 'month');

  const refDate = params.date ?? new Date().toISOString().slice(0, 10);
  const { start, end, prevStart, prevEnd } = computeRange(period, refDate);

  // Para "evolución temporal" cargamos hasta 12 períodos hacia atrás (sin filtrar paid)
  const trailStart = computeTrailStart(period, refDate, 12);

  const [
    { data: currentExpenses },
    { data: previousExpenses },
    { data: trailExpenses },
    { data: categories },
    { data: settings },
    rates,
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, amount, currency, expense_date, description, category_id, categories(name, color)')
      .gte('expense_date', start)
      .lte('expense_date', end),
    supabase
      .from('expenses')
      .select('id, amount, currency, expense_date')
      .gte('expense_date', prevStart)
      .lte('expense_date', prevEnd),
    supabase
      .from('expenses')
      .select('id, amount, currency, expense_date')
      .gte('expense_date', trailStart)
      .lte('expense_date', end),
    supabase.from('categories').select('*'),
    supabase.from('user_settings').select('default_currency').single(),
    getRates(),
  ]);

  const userCurrency = (settings?.default_currency ?? 'ARS') as Currency;
  const displayCurrency = (params.asCurrency ?? userCurrency) as Currency;

  return (
    <MetricsClient
      period={period}
      refDate={refDate}
      range={{ start, end, prevStart, prevEnd }}
      currentExpenses={currentExpenses ?? []}
      previousExpenses={previousExpenses ?? []}
      trailExpenses={trailExpenses ?? []}
      categories={categories ?? []}
      defaultCurrency={userCurrency}
      displayCurrency={displayCurrency}
      rates={rates.rates}
    />
  );
}

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
