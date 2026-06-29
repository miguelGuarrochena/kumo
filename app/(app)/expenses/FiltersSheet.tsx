'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { CURRENCIES, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName, getCategoryPresetKey } from '@/lib/categoryLabels';

type CategoryLite = {
  id: string;
  name: string;
  color: string;
  kind?: 'expense' | 'income';
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
  kind: '' | 'expense' | 'income';
  sort: string;
};

// Subconjunto de filtros avanzados que maneja este panel (sin q/kind/sort).
export type AdvFilters = Omit<Filters, 'q' | 'kind' | 'sort'>;

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
  value: AdvFilters;
  onApply: (next: AdvFilters) => void;
  categories: CategoryLite[];
};

export const FiltersSheet = ({ open, onClose, value, onApply, categories }: FiltersSheetProps) => {
  const { t } = useT();

  const [cats, setCats] = useState<string[]>(value.cat);
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [min, setMin] = useState(value.min);
  const [max, setMax] = useState(value.max);
  const [paid, setPaid] = useState(value.paid);
  const [rec, setRec] = useState(value.rec);
  const [cur, setCur] = useState(value.cur);

  // Sincronizamos el borrador con el valor actual cada vez que se abre el panel.
  useEffect(() => {
    if (!open) return;
    setCats(value.cat);
    setFrom(value.from);
    setTo(value.to);
    setMin(value.min);
    setMax(value.max);
    setPaid(value.paid);
    setRec(value.rec);
    setCur(value.cur);

  }, [open, value]);

  const toggleCat = (id: string) => {
    setCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  // "Otros" siempre al final; el resto alfabético.
  const sortCats = (list: CategoryLite[]) =>
    [...list].sort((a, b) => {
      const ao = getCategoryPresetKey(a.name) === 'other';
      const bo = getCategoryPresetKey(b.name) === 'other';
      if (ao !== bo) return ao ? 1 : -1;
      return categoryDisplayName(a.name, t).localeCompare(categoryDisplayName(b.name, t));
    });
  const expenseCats = sortCats(categories.filter((c) => (c.kind ?? 'expense') === 'expense'));
  const incomeCats = sortCats(categories.filter((c) => c.kind === 'income'));

  const catButton = (c: CategoryLite) => {
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
  };

  // Validaciones de rango: "Hasta" ≥ "Desde" y monto máx ≥ mín.
  const dateError = !!from && !!to && to < from;
  const amountError =
    !!min && !!max && Number.isFinite(Number(min)) && Number.isFinite(Number(max)) && Number(max) < Number(min);
  const hasError = dateError || amountError;

  const apply = () => {
    if (hasError) return;
    onApply({ cat: cats, from, to, min, max, paid, rec, cur });
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
        {/* Categorías — separadas en Gastos e Ingresos */}
        <Section title={t.expenses.filter_section_categories}>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-1.5">
                {t.expenses.filter_kind_expense}
              </p>
              <div className="flex flex-wrap gap-2">
                {expenseCats.map(catButton)}
                {expenseCats.length === 0 && <p className="text-sm text-slate-400">—</p>}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-mint-600 dark:text-mint-400 mb-1.5">
                {t.expenses.filter_kind_income}
              </p>
              <div className="flex flex-wrap gap-2">
                {incomeCats.map(catButton)}
                {incomeCats.length === 0 && <p className="text-sm text-slate-400">—</p>}
              </div>
            </div>
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
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.filter_date_to}</label>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base ${
                  dateError ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
            </div>
          </div>
          {dateError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{t.expenses.filter_date_range_error}</p>
          )}
        </Section>

        {/* Rango de montos */}
        <Section title={t.expenses.filter_section_amount}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.filter_amount_min}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
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
                min={min || 0}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="∞"
                className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base ${
                  amountError ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
            </div>
          </div>
          {amountError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{t.expenses.filter_amount_range_error}</p>
          )}
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
            disabled={hasError}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
