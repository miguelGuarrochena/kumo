'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sheet } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { CURRENCIES, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName } from '@/lib/categoryLabels';

type CategoryLite = {
  id: string;
  name: string;
  color: string;
};

export type Filters = {
  q: string;
  cat: string[];
  from: string;
  to: string;
  min: string;
  max: string;
  paid: '' | 'paid' | 'pending';
  rec: '' | 'recurring' | 'one-time';
  cur: string;
  sort: string;
};

const COLOR_DOT: Record<string, string> = {
  sky: 'bg-sky-400',
  lavender: 'bg-lavender-400',
  peach: 'bg-peach-300',
  mint: 'bg-mint-400',
  rose: 'bg-rose-300',
};

type FiltersSheetProps = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  categories: CategoryLite[];
};

export const FiltersSheet = ({ open, onClose, filters, categories }: FiltersSheetProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();

  const [cats, setCats] = useState<string[]>(filters.cat);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);
  const [paid, setPaid] = useState(filters.paid);
  const [rec, setRec] = useState(filters.rec);
  const [cur, setCur] = useState(filters.cur);

  // Re-sincronizamos el estado local con los filtros de la URL cada vez que se
  // abre el sheet. Sin esto, borrar chips en la lista y reabrir mostraba valores
  // viejos (el useState solo corre en el mount inicial).
  useEffect(() => {
    if (!open) return;
    setCats(filters.cat);
    setFrom(filters.from);
    setTo(filters.to);
    setMin(filters.min);
    setMax(filters.max);
    setPaid(filters.paid);
    setRec(filters.rec);
    setCur(filters.cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filters]);

  const toggleCat = (id: string) => {
    setCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'all');
    setOrDelete(params, 'cat', cats.join(','));
    setOrDelete(params, 'from', from);
    setOrDelete(params, 'to', to);
    setOrDelete(params, 'min', min);
    setOrDelete(params, 'max', max);
    setOrDelete(params, 'paid', paid);
    setOrDelete(params, 'rec', rec);
    setOrDelete(params, 'cur', cur);
    router.push(`/expenses?${params.toString()}`);
    onClose();
  };

  const reset = () => {
    setCats([]);
    setFrom('');
    setTo('');
    setMin('');
    setMax('');
    setPaid('');
    setRec('');
    setCur('');
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.common.filters}>
      <div className="space-y-5">
        {/* Categorías */}
        <Section title={t.expenses.filter_section_categories}>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = cats.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCat(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    active
                      ? 'kumo-gradient text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${COLOR_DOT[c.color] ?? 'bg-slate-300'}`} />
                  {categoryDisplayName(c.name, t)}
                </button>
              );
            })}
            {categories.length === 0 && (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </Section>

        {/* Rango de fechas */}
        <Section title={t.expenses.filter_section_dates}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.filter_date_from}</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.filter_date_to}</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
          </div>
        </Section>

        {/* Rango de montos */}
        <Section title={t.expenses.filter_section_amount}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.filter_amount_min}</label>
              <input
                type="number"
                inputMode="decimal"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.filter_amount_max}</label>
              <input
                type="number"
                inputMode="decimal"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
          </div>
        </Section>

        {/* Estado de pago */}
        <Section title={t.expenses.filter_section_state}>
          <Segments
            value={paid}
            onChange={(v) => setPaid(v as Filters['paid'])}
            options={[
              { value: '', label: t.common.all },
              { value: 'paid', label: t.expenses.filter_paid },
              { value: 'pending', label: t.expenses.filter_pending },
            ]}
          />
        </Section>

        {/* Recurrencia */}
        <Section title={t.expenses.filter_section_recurrence}>
          <Segments
            value={rec}
            onChange={(v) => setRec(v as Filters['rec'])}
            options={[
              { value: '', label: t.common.all },
              { value: 'recurring', label: t.expenses.filter_recurring },
              { value: 'one-time', label: t.expenses.filter_one_time },
            ]}
          />
        </Section>

        {/* Moneda */}
        <Section title={t.expenses.filter_section_currency}>
          <Select
            value={cur}
            onChange={setCur}
            options={[
              { value: '', label: t.expenses.filter_currency_all },
              ...CURRENCIES.map((c) => ({ value: c.code, label: c.label, hint: c.code })),
            ]}
            ariaLabel={t.expenses.currency}
          />
        </Section>

        <div className="flex gap-2 pt-3 sticky bottom-0 bg-white dark:bg-slate-800 pb-1">
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.expenses.filter_clear}
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90"
          >
            {t.expenses.filter_apply}
          </button>
        </div>
      </div>
    </Sheet>
  );
};

type SectionProps = { title: string; children: React.ReactNode };

const Section = ({ title, children }: SectionProps) => {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{title}</h3>
      {children}
    </div>
  );
};

type SegmentsProps<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
};

const Segments = <T extends string>({ value, onChange, options }: SegmentsProps<T>) => {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === opt.value ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}
