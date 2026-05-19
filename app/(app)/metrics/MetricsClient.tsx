'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CURRENCIES, formatMoney, type Currency } from '@/lib/currency';
import type { MetricsPeriod } from './page';

type ExpenseFull = {
  id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string | null;
  category_id: string | null;
  categories: { name: string; color: string } | null;
};

type ExpenseLite = {
  id: string;
  amount: number;
  currency: string;
  expense_date: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  period: MetricsPeriod;
  refDate: string;
  range: { start: string; end: string; prevStart: string; prevEnd: string };
  currentExpenses: ExpenseFull[];
  previousExpenses: ExpenseLite[];
  trailExpenses: ExpenseLite[];
  categories: Category[];
  defaultCurrency: Currency;
  displayCurrency: Currency;
  rates: Partial<Record<Currency, number>>;
};

const COLOR_HEX: Record<string, string> = {
  sky:      '#38bdf8',
  lavender: '#c084fc',
  peach:    '#fb923c',
  mint:     '#34d399',
  rose:     '#fb7185',
};

const FALLBACK_COLORS = ['#38bdf8', '#c084fc', '#fb923c', '#34d399', '#fb7185', '#facc15', '#22d3ee'];

export function MetricsClient({
  period,
  refDate,
  range,
  currentExpenses,
  previousExpenses,
  trailExpenses,
  categories,
  defaultCurrency,
  displayCurrency,
  rates,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper: convertir cualquier monto a displayCurrency
  const convert = useMemo(() => {
    return (amount: number, currency: string): number => {
      if (currency === displayCurrency) return amount;
      const fromRate = rates[currency as Currency];
      const toRate = rates[displayCurrency];
      if (!fromRate || !toRate) return 0;
      return (amount / fromRate) * toRate;
    };
  }, [displayCurrency, rates]);

  const total = currentExpenses.reduce((s, e) => s + convert(Number(e.amount), e.currency), 0);
  const previousTotal = previousExpenses.reduce(
    (s, e) => s + convert(Number(e.amount), e.currency),
    0,
  );

  const diff = total - previousTotal;
  const diffPct = previousTotal > 0 ? (diff / previousTotal) * 100 : null;

  // Agregación por categoría
  const byCategory = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; total: number }>();
    for (const e of currentExpenses) {
      const id = e.category_id ?? '__none__';
      const name = e.categories?.name ?? 'Sin categoría';
      const color = e.categories?.color ?? 'sky';
      const existing = map.get(id);
      const amount = convert(Number(e.amount), e.currency);
      if (existing) existing.total += amount;
      else map.set(id, { id, name, color, total: amount });
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [currentExpenses, convert]);

  // Top 5 gastos individuales
  const topExpenses = useMemo(() => {
    return [...currentExpenses]
      .map((e) => ({ ...e, normalized: convert(Number(e.amount), e.currency) }))
      .sort((a, b) => b.normalized - a.normalized)
      .slice(0, 5);
  }, [currentExpenses, convert]);

  // Trail temporal: agrupar trailExpenses según el período activo
  const trailData = useMemo(() => buildTrail(period, refDate, trailExpenses, convert), [
    period,
    refDate,
    trailExpenses,
    convert,
  ]);

  // ---- Navegación de período ----
  const navigate = (delta: number) => {
    const newDate = shiftRefDate(period, refDate, delta);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', newDate);
    router.push(`/metrics?${params.toString()}`);
  };

  const setPeriod = (p: MetricsPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', p);
    router.push(`/metrics?${params.toString()}`);
  };

  const setCurrencyParam = (c: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (c) params.set('asCurrency', c);
    else params.delete('asCurrency');
    router.push(`/metrics?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Métricas</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Seguí tus gastos en tiempo real.
        </p>
      </header>

      {/* Toggle de período */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {(['day', 'week', 'month', 'year'] as MetricsPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Total + navegación + currency */}
      <div className="kumo-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold capitalize text-center text-sm sm:text-base">
            {formatRangeLabel(period, range.start, range.end)}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Total gastado</p>
          <p className="text-3xl sm:text-4xl font-bold kumo-gradient-text break-all">
            {formatMoney(total, displayCurrency)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            {currentExpenses.length} {currentExpenses.length === 1 ? 'gasto' : 'gastos'} · en
            <select
              value={displayCurrency}
              onChange={(e) => setCurrencyParam(e.target.value)}
              aria-label="Moneda"
              className="appearance-none bg-transparent border-0 px-0 py-0 font-medium text-slate-500 dark:text-slate-300 cursor-pointer underline decoration-dotted decoration-slate-300 dark:decoration-slate-600 underline-offset-2 hover:text-sky-600 hover:decoration-sky-400 focus:outline-none focus:text-sky-600 transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </p>

          {diffPct !== null && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700">
              {diff > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              ) : diff < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-mint-500" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={diff > 0 ? 'text-rose-500' : diff < 0 ? 'text-mint-500' : 'text-slate-500'}>
                {diff === 0 ? 'igual' : `${diff > 0 ? '+' : ''}${diffPct.toFixed(0)}%`}
              </span>
              <span className="text-slate-400">vs período anterior</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos solo si hay data */}
      {currentExpenses.length === 0 ? (
        <div className="kumo-card p-10 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            Sin gastos en este período. Cargá algunos en <strong>Gastos</strong> para ver métricas.
          </p>
        </div>
      ) : (
        <>
          {/* Fila combinada: Pie chart + Top 5 lado a lado en desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="kumo-card p-5">
              <h3 className="font-semibold mb-3">Por categoría</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-44 h-44 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {byCategory.map((c, i) => (
                          <Cell
                            key={c.id}
                            fill={COLOR_HEX[c.color] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatMoney(value, displayCurrency)}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 w-full min-w-0 space-y-1.5">
                  {byCategory.slice(0, 6).map((c, i) => {
                    const pct = total > 0 ? (c.total / total) * 100 : 0;
                    return (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: COLOR_HEX[c.color] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                          {pct.toFixed(0)}%
                        </span>
                        <span className="font-medium tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {formatMoney(c.total, displayCurrency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="kumo-card p-5">
              <h3 className="font-semibold mb-3">Top 5 gastos del período</h3>
              <div className="space-y-2">
                {topExpenses.map((e, i) => {
                  const cat = e.categories;
                  const color = cat ? COLOR_HEX[cat.color] ?? FALLBACK_COLORS[0] : '#cbd5e1';
                  return (
                    <div key={e.id} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400 w-4">{i + 1}</span>
                      <span className="w-2 h-8 rounded-full shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.description || cat?.name || 'Gasto'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {cat?.name ?? 'Sin categoría'} · {formatDate(e.expense_date)}
                        </p>
                      </div>
                      <p className="font-semibold text-sm tabular-nums whitespace-nowrap">
                        {formatMoney(e.normalized, displayCurrency)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfico de evolución temporal */}
          <div className="kumo-card p-5">
            <h3 className="font-semibold mb-3">Evolución · últimos 12 {PERIOD_PLURAL[period]}</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={trailData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'rgb(148 163 184)' }}
                    tickFormatter={(v) => abbreviateNumber(v)}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => formatMoney(value, displayCurrency)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="url(#kumoBarGrad)" />
                  <defs>
                    <linearGradient id="kumoBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// Helpers
// =====================================================================

const PERIOD_LABELS: Record<MetricsPeriod, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

const PERIOD_PLURAL: Record<MetricsPeriod, string> = {
  day: 'días',
  week: 'semanas',
  month: 'meses',
  year: 'años',
};

function formatRangeLabel(period: MetricsPeriod, start: string, end: string): string {
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  if (period === 'day') {
    return s.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (period === 'week') {
    return `${s.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} — ${e.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (period === 'month') {
    return s.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }
  return s.toLocaleDateString('es-AR', { year: 'numeric' });
}

function shiftRefDate(period: MetricsPeriod, refDate: string, delta: number): string {
  const d = new Date(refDate + 'T12:00:00');
  if (period === 'day') d.setDate(d.getDate() + delta);
  else if (period === 'week') d.setDate(d.getDate() + delta * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + delta);
  else d.setFullYear(d.getFullYear() + delta);
  return d.toISOString().slice(0, 10);
}

function buildTrail(
  period: MetricsPeriod,
  refDate: string,
  expenses: ExpenseLite[],
  convert: (amt: number, cur: string) => number,
): { label: string; total: number }[] {
  const count = 12;
  const buckets: { key: string; label: string; total: number }[] = [];
  const ref = new Date(refDate + 'T12:00:00');

  for (let i = count - 1; i >= 0; i--) {
    let d: Date;
    let key: string;
    let label: string;
    if (period === 'day') {
      d = new Date(ref);
      d.setDate(d.getDate() - i);
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    } else if (period === 'week') {
      d = new Date(ref);
      d.setDate(d.getDate() - i * 7);
      // ISO week
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - (day - 1));
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    } else if (period === 'month') {
      d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = d.toLocaleDateString('es-AR', { month: 'short' });
    } else {
      d = new Date(ref.getFullYear() - i, 0, 1);
      key = String(d.getFullYear());
      label = key;
    }
    buckets.push({ key, label, total: 0 });
  }

  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

  for (const e of expenses) {
    const d = new Date(e.expense_date + 'T12:00:00');
    let key: string;
    if (period === 'day') {
      key = e.expense_date;
    } else if (period === 'week') {
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day - 1));
      key = monday.toISOString().slice(0, 10);
    } else if (period === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = String(d.getFullYear());
    }
    const idx = bucketIndex.get(key);
    if (idx !== undefined) {
      const bucket = buckets[idx]!;
      bucket.total += convert(Number(e.amount), e.currency);
    }
  }

  return buckets;
}

function abbreviateNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}
