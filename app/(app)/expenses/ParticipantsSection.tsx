'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { createAdHocContact } from '../settings/contactsActions';
import type { ContactLite } from './splitTypes';

type ParticipantsSectionProps = {
  contacts: ContactLite[];
  participantIds: string[];
  values: Record<string, string>;
  setValue: (cid: string, v: string) => void;
  mode: 'equal' | 'percentage' | 'fixed';
  totalAmount: number;
  currency: Currency;
  onToggle: (id: string) => void;
  onAdd: (id: string) => void;
};

// Fusión de "elegir participantes" + "poner valores". Los seleccionados
// aparecen como filas con su input + botón ✕; los demás como chips para sumar.
export const ParticipantsSection = ({
  contacts,
  participantIds,
  values,
  setValue,
  mode,
  totalAmount,
  currency,
  onToggle,
  onAdd,
}: ParticipantsSectionProps) => {
  const { t, locale } = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);

  const selected: ContactLite[] = participantIds
    .map((id) => contacts.find((c) => c.id === id))
    .filter((c): c is ContactLite => !!c);
  const available = contacts.filter((c) => !participantIds.includes(c.id));

  const helper =
    mode === 'percentage'
      ? t.split.values_pct_helper.replace('{total}', formatMoney(totalAmount, currency, locale))
      : mode === 'fixed'
        ? t.split.values_fixed_helper.replace('{total}', formatMoney(totalAmount, currency, locale))
        : t.split.participants_tap_hint;

  const eachEqual =
    selected.length > 0 && totalAmount > 0 ? totalAmount / selected.length : 0;

  const unit = mode === 'percentage' ? '%' : currency;

  const tryAdd = async () => {
    const v = text.trim();
    if (!v) return;
    const match = contacts.find((c) => c.name.toLowerCase() === v.toLowerCase());
    if (match) {
      onAdd(match.id);
      setText('');
      return;
    }
    setCreating(true);
    try {
      const r = await createAdHocContact(v);
      if (r.ok && r.id) {
        onAdd(r.id);
        setText('');
        toast.success(t.split.person_added.replace('{name}', v));
        router.refresh();
      } else {
        toast.error(r.error ?? t.split.person_could_not_create);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      {/* Lista de seleccionados con su valor */}
      {selected.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-1">
          {t.split.values_no_participants}
        </p>
      ) : (
        <div className="space-y-1.5">
          {selected.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-800/30"
            >
              <span className="flex-1 text-sm truncate text-slate-800 dark:text-slate-100">
                {p.name}{p.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
              </span>
              {mode === 'equal' ? (
                <span className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
                  {totalAmount > 0 ? formatMoney(eachEqual, currency, locale) : '—'}
                </span>
              ) : (
                <div className="relative w-28">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={mode === 'percentage' ? '0.1' : '0.01'}
                    value={values[p.id] ?? ''}
                    onChange={(e) => setValue(p.id, e.target.value)}
                    placeholder="0"
                    className="w-full pl-2 pr-9 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    {unit}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-label={t.split.participants_remove}
                title={t.split.participants_remove}
                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Helper text contextual al modo */}
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{helper}</p>

      {/* Otros contactos disponibles como chips chicos */}
      {available.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 font-semibold">
            {selected.length === 0 ? t.split.participants_available : t.split.participants_others}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input para agregar persona nueva */}
      <div className="flex gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/50">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              tryAdd();
            }
          }}
          placeholder={t.split.add_person}
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
        <button
          type="button"
          onClick={tryAdd}
          disabled={creating || !text.trim()}
          aria-label={t.split.add_person_short}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
