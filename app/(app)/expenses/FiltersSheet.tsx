'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sheet } from '@/components/Sheet';
import { CURRENCIES, type Currency } from '@/lib/currency';

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

export function FiltersSheet({
  open,
  onClose,
  filters,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  categories: CategoryLite[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cats, setCats] = useState<string[]>(filters.cat);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);
  const [paid, setPaid] = useState(filters.paid);
  const [rec, setRec] = useState(filters.rec);
  const [cur, setCur] = useState(filters.cur);

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
    <Sheet open={open} onClose={onClose} title="Filtros">
      <div className="space-y-5">
        {/* Categorías */}
        <Section title="Categorías">
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
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${COLOR_DOT[c.color] ?? 'bg-slate-300'}`} />
                  {c.name}
                </button>
              );
            })}
            {categories.length === 0 && (
              <p className="text-sm text-slate-400">No tenés categorías todavía.</p>
            )}
          </div>
        </Section>

        {/* Rango de fechas */}
        <Section title="Rango de fechas">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
          </div>
        </Section>

        {/* Rango de montos */}
        <Section title="Monto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Mínimo</label>
              <input
                type="number"
                inputMode="decimal"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Máximo</label>
              <input
                type="number"
                inputMode="decimal"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
          </div>
        </Section>

        {/* Estado de pago */}
        <Section title="Estado">
          <Segments
            value={paid}
            onChange={(v) => setPaid(v as Filters['paid'])}
            options={[
              { value: '', label: 'Todos' },
              { value: 'paid', label: 'Pagados' },
              { value: 'pending', label: 'Pendientes' },
            ]}
          />
        </Section>

        {/* Recurrencia */}
        <Section title="Recurrencia">
          <Segments
            value={rec}
            onChange={(v) => setRec(v as Filters['rec'])}
            options={[
              { value: '', label: 'Todos' },
              { value: 'recurring', label: 'Recurrentes' },
              { value: 'one-time', label: 'Una vez' },
            ]}
          />
        </Section>

        {/* Moneda */}
        <Section title="Moneda">
          <select
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white"
          >
            <option value="">Todas</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.label}
              </option>
            ))}
          </select>
        </Section>

        <div className="flex gap-2 pt-3 sticky bottom-0 bg-white pb-1">
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Segments<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === opt.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}
