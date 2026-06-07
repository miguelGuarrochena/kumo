'use client';

// SplitEditor: cuerpo controlado del editor de división, embebido inline
// dentro del form de gasto (ExpenseSheet). El estado del split se controla
// desde afuera y se guarda junto con el gasto en el mismo submit, así no
// hay un segundo paso para dividir.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { Select } from '@/components/Select';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { createAdHocContact } from '../settings/contactsActions';

export type ContactLite = {
  id: string;
  name: string;
  is_self: boolean;
};

export type SplitMode = 'equal' | 'percentage' | 'fixed' | 'items' | null;

export type SplitItem = { name: string; price: number; contact_ids: string[] };

export type SplitState = {
  mode: SplitMode;
  paidById: string | null;
  participantIds: string[];
  values: Record<string, string>;
  items: SplitItem[];
};

export const emptySplitState = (): SplitState => ({
  mode: null,
  paidById: null,
  participantIds: [],
  values: {},
  items: [],
});

// =====================================================================
// SplitEditor controlado (sin Sheet wrapper)
// =====================================================================
type SplitEditorProps = {
  totalAmount: number;
  currency: Currency;
  contacts: ContactLite[];
  state: SplitState;
  setState: React.Dispatch<React.SetStateAction<SplitState>>;
};

export const SplitEditor = ({
  totalAmount,
  currency,
  contacts,
  state,
  setState,
}: SplitEditorProps) => {
  const { t } = useT();
  const setMode = (mode: SplitMode) => {
    // Al cambiar de modo reseteamos los valores específicos del modo
    // (porcentajes/montos/items) para no arrastrar datos que no aplican.
    setState((s) => ({
      ...s,
      mode,
      values: {},
      // Items se mantiene solo dentro del modo items
      items: mode === 'items' ? s.items : [],
    }));
  };

  const setPaidById = (id: string | null) => setState((s) => ({ ...s, paidById: id }));

  const toggleParticipant = (id: string) => {
    setState((s) =>
      s.participantIds.includes(id)
        ? {
            ...s,
            participantIds: s.participantIds.filter((x) => x !== id),
            // Quitar también su valor seteado para que no se arrastre fantasma
            values: Object.fromEntries(
              Object.entries(s.values).filter(([k]) => k !== id),
            ),
          }
        : autocompleteOnAdd(s, id, totalAmount),
    );
  };

  const addParticipant = (id: string) => {
    setState((s) => {
      if (s.participantIds.includes(id)) return s;
      return autocompleteOnAdd(s, id, totalAmount);
    });
  };

  const setValue = (cid: string, v: string) => {
    setState((s) => {
      const next = { ...s, values: { ...s.values, [cid]: v } };
      // En modo porcentaje, redistribuir lo que falta entre los otros
      // participantes proporcionalmente para que sume 100.
      if (s.mode === 'percentage') {
        const total = 100;
        const editedNum = parseFloat(v) || 0;
        const others = s.participantIds.filter((id) => id !== cid);
        if (others.length > 0) {
          const remaining = Math.max(0, total - editedNum);
          // Si los otros estaban en 0 o no estaban seteados, dividir el
          // remaining en partes iguales.
          const currentOthersSum = others.reduce(
            (sum, id) => sum + (parseFloat(next.values[id] ?? '0') || 0),
            0,
          );
          if (currentOthersSum === 0) {
            const each = remaining / others.length;
            for (const id of others) next.values[id] = trim(each);
          } else {
            // Escalar proporcionalmente
            const scale = remaining / currentOthersSum;
            for (const id of others) {
              const cur = parseFloat(next.values[id] ?? '0') || 0;
              next.values[id] = trim(cur * scale);
            }
          }
        }
      }
      return next;
    });
  };

  const setItems = (updater: (prev: SplitItem[]) => SplitItem[]) =>
    setState((s) => ({ ...s, items: updater(s.items) }));

  const enabled = state.mode !== null;

  const computed = useMemo(() => {
    const result: Record<string, number> = {};
    if (state.mode === null) return result;
    if (state.mode === 'items') {
      for (const it of state.items) {
        const p = Number(it.price) || 0;
        if (it.contact_ids.length === 0) continue;
        const portion = p / it.contact_ids.length;
        for (const cid of it.contact_ids) result[cid] = (result[cid] ?? 0) + portion;
      }
      return result;
    }
    if (state.mode === 'equal') {
      if (state.participantIds.length === 0) return result;
      const each = totalAmount / state.participantIds.length;
      for (const cid of state.participantIds) result[cid] = each;
      return result;
    }
    if (state.mode === 'percentage') {
      for (const cid of state.participantIds) {
        const v = parseFloat(state.values[cid] ?? '0') || 0;
        result[cid] = (totalAmount * v) / 100;
      }
      return result;
    }
    if (state.mode === 'fixed') {
      for (const cid of state.participantIds) {
        result[cid] = parseFloat(state.values[cid] ?? '0') || 0;
      }
      return result;
    }
    return result;
  }, [state, totalAmount]);

  const sumComputed = Object.values(computed).reduce((s, v) => s + v, 0);

  const participantsForPreview: ContactLite[] = useMemo(() => {
    const ids = new Set<string>();
    if (state.mode === 'items') {
      for (const it of state.items) for (const cid of it.contact_ids) ids.add(cid);
    } else {
      for (const id of state.participantIds) ids.add(id);
    }
    return Array.from(ids)
      .map((id) => contacts.find((c) => c.id === id))
      .filter((c): c is ContactLite => !!c);
  }, [state.mode, state.items, state.participantIds, contacts]);

  return (
    <div className="space-y-4">
      {/* Quién pagó */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {t.split.who_paid}
        </label>
        <Select
          value={state.paidById ?? ''}
          onChange={(v) => setPaidById(v || null)}
          options={contacts.map((c) => ({
            value: c.id,
            label: c.name + (c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''),
          }))}
          placeholder={t.split.who_paid_placeholder}
          ariaLabel={t.split.who_paid_short}
          buttonClassName="py-2.5"
        />
      </div>

      {/* Participantes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {t.split.divide_between}
        </label>
        <ParticipantsPicker
          contacts={contacts}
          participantIds={state.participantIds}
          onToggle={toggleParticipant}
          onAdd={addParticipant}
        />
      </div>

      {/* Modo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {t.split.mode}
        </label>
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {([
            { v: 'equal' as const,      label: t.split.mode_equal },
            { v: 'percentage' as const, label: t.split.mode_percentage },
            { v: 'fixed' as const,      label: t.split.mode_fixed },
            { v: 'items' as const,      label: t.split.mode_items },
          ]).map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMode(m.v)}
              className={`px-1.5 py-2 rounded text-[11px] sm:text-xs font-medium transition-colors text-center leading-tight ${
                state.mode === m.v
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          {state.mode === 'equal' && state.participantIds.length > 0 && totalAmount > 0
            ? t.split.mode_equal_each.replace('{amount}', formatMoney(totalAmount / state.participantIds.length, currency))
            : state.mode === 'equal'      ? t.split.mode_equal_hint
            : state.mode === 'percentage' ? t.split.mode_percentage_hint
            : state.mode === 'fixed'      ? t.split.mode_fixed_hint
            : state.mode === 'items'      ? t.split.mode_items_hint
            : t.split.mode_choose}
        </p>
      </div>

      {/* Inputs por modo */}
      {state.mode === 'items' ? (
        <ItemsEditor
          items={state.items}
          setItems={setItems}
          contacts={contacts}
          totalAmount={totalAmount}
          currency={currency}
        />
      ) : state.mode === 'percentage' || state.mode === 'fixed' ? (
        <ValuesEditor
          participants={state.participantIds.map((id) => contacts.find((c) => c.id === id)).filter((c): c is ContactLite => !!c)}
          values={state.values}
          setValue={setValue}
          mode={state.mode}
          totalAmount={totalAmount}
          currency={currency}
        />
      ) : null}

      {/* Preview */}
      {enabled && participantsForPreview.length > 0 && (
        <SplitPreview
          participants={participantsForPreview}
          computed={computed}
          paidById={state.paidById}
          totalAmount={totalAmount}
          sumComputed={sumComputed}
          currency={currency}
        />
      )}
    </div>
  );
};

// =====================================================================
// Helpers internos
// =====================================================================
const trim = (n: number): string => {
  if (!isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
};

// Cuando se agrega un participante en modo porcentaje, le asignamos el
// remaining (100 - suma de los demás) para que el total cierre solo.
const autocompleteOnAdd = (s: SplitState, newId: string, totalAmount: number): SplitState => {
  const nextIds = [...s.participantIds, newId];
  if (s.mode !== 'percentage' && s.mode !== 'fixed') {
    return { ...s, participantIds: nextIds };
  }
  const cap = s.mode === 'percentage' ? 100 : totalAmount;
  const sumOthers = s.participantIds.reduce(
    (sum, id) => sum + (parseFloat(s.values[id] ?? '0') || 0),
    0,
  );
  const remaining = Math.max(0, cap - sumOthers);
  return {
    ...s,
    participantIds: nextIds,
    values: { ...s.values, [newId]: trim(remaining) },
  };
};

// =====================================================================
// Preview visual: cada participante con su monto + total al pie
// =====================================================================
export const SplitPreview = ({
  participants,
  computed,
  paidById,
  totalAmount,
  sumComputed,
  currency,
}: {
  participants: ContactLite[];
  computed: Record<string, number>;
  paidById: string | null;
  totalAmount: number;
  sumComputed: number;
  currency: Currency;
}) => {
  const { t } = useT();
  const sumOk = Math.abs(sumComputed - totalAmount) < 0.01;
  const diff = totalAmount - sumComputed;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {t.split.preview_each_pays}
        </p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {participants.map((p) => {
          const amount = computed[p.id] ?? 0;
          const isPayer = p.id === paidById;
          return (
            <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-sm truncate flex items-center gap-1.5">
                {p.name}{p.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
                {isPayer && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mint-100 text-mint-600 dark:bg-mint-500/20 dark:text-mint-300 font-semibold uppercase tracking-wider">
                    {t.split.preview_paid_badge}
                  </span>
                )}
              </span>
              <span className="font-semibold text-sm tabular-nums">
                {formatMoney(amount, currency)}
              </span>
            </div>
          );
        })}
      </div>
      <div className={`px-4 py-2.5 flex items-center justify-between gap-2 border-t-2 ${
        sumOk
          ? 'border-mint-200 bg-mint-50/60 dark:border-mint-500/30 dark:bg-mint-500/10'
          : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10'
      }`}>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
          {sumOk ? <Check className="w-3.5 h-3.5 text-mint-600 dark:text-mint-400" /> : null}
          {t.split.preview_total}
        </span>
        <span className="text-sm font-bold tabular-nums">
          {formatMoney(sumComputed, currency)} / {formatMoney(totalAmount, currency)}
        </span>
      </div>
      {!sumOk && (
        <div className="px-4 py-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-500/5">
          {diff > 0
            ? t.split.preview_missing.replace('{amount}', formatMoney(diff, currency))
            : t.split.preview_extra.replace('{amount}', formatMoney(Math.abs(diff), currency))}
        </div>
      )}
    </div>
  );
};

// Helper compartido: computar splits dado un state + totalAmount.
export const computeSplits = (state: SplitState, totalAmount: number): Record<string, number> => {
  const result: Record<string, number> = {};
  if (state.mode === null) return result;
  if (state.mode === 'items') {
    for (const it of state.items) {
      const p = Number(it.price) || 0;
      if (it.contact_ids.length === 0) continue;
      const portion = p / it.contact_ids.length;
      for (const cid of it.contact_ids) result[cid] = (result[cid] ?? 0) + portion;
    }
    return result;
  }
  if (state.mode === 'equal') {
    if (state.participantIds.length === 0) return result;
    const each = totalAmount / state.participantIds.length;
    for (const cid of state.participantIds) result[cid] = each;
    return result;
  }
  if (state.mode === 'percentage') {
    for (const cid of state.participantIds) {
      const v = parseFloat(state.values[cid] ?? '0') || 0;
      result[cid] = (totalAmount * v) / 100;
    }
    return result;
  }
  if (state.mode === 'fixed') {
    for (const cid of state.participantIds) {
      result[cid] = parseFloat(state.values[cid] ?? '0') || 0;
    }
    return result;
  }
  return result;
};

export const isSumOk = (state: SplitState, sumComputed: number, totalAmount: number): boolean => {
  if (state.mode === null) return true;
  if (state.mode === 'equal') return true;
  if (state.mode === 'items') return state.items.length > 0 && Math.abs(sumComputed - totalAmount) < 0.01;
  if (state.mode === 'percentage') return state.participantIds.length > 0 && Math.abs(sumComputed - totalAmount) < 0.5;
  if (state.mode === 'fixed') return state.participantIds.length > 0 && Math.abs(sumComputed - totalAmount) < 0.01;
  return false;
};

// =====================================================================
// ParticipantsPicker, ValuesEditor, ItemsEditor (componentes internos)
// =====================================================================
const ParticipantsPicker = ({
  contacts,
  participantIds,
  onToggle,
  onAdd,
}: {
  contacts: ContactLite[];
  participantIds: string[];
  onToggle: (id: string) => void;
  onAdd: (id: string) => void;
}) => {
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);

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
    <div className="space-y-2">
      {contacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contacts.map((c) => {
            const on = participantIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  on
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                {c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-1.5">
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
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
        <button
          type="button"
          onClick={tryAdd}
          disabled={creating || !text.trim()}
          aria-label={t.split.add_person_short}
          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

const ValuesEditor = ({
  participants,
  values,
  setValue,
  mode,
  totalAmount,
  currency,
}: {
  participants: ContactLite[];
  values: Record<string, string>;
  setValue: (cid: string, v: string) => void;
  mode: 'percentage' | 'fixed';
  totalAmount: number;
  currency: Currency;
}) => {
  const { t } = useT();
  if (participants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-xs text-slate-400 italic">
        {t.split.values_no_participants}
      </div>
    );
  }
  const unit = mode === 'percentage' ? '%' : currency;
  const helper = (mode === 'percentage' ? t.split.values_pct_helper : t.split.values_fixed_helper)
    .replace('{total}', formatMoney(totalAmount, currency));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">{helper}</p>
      {participants.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="flex-1 text-sm truncate">
            {p.name}{p.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
          </span>
          <div className="relative w-32">
            <input
              type="number"
              inputMode="decimal"
              step={mode === 'percentage' ? '0.1' : '0.01'}
              value={values[p.id] ?? ''}
              onChange={(e) => setValue(p.id, e.target.value)}
              placeholder="0"
              className="w-full pl-3 pr-10 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
              {unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ItemsEditor = ({
  items,
  setItems,
  contacts,
  totalAmount,
  currency,
}: {
  items: SplitItem[];
  setItems: (updater: (prev: SplitItem[]) => SplitItem[]) => void;
  contacts: ContactLite[];
  totalAmount: number;
  currency: Currency;
}) => {
  const { t } = useT();
  const updateItem = (i: number, patch: Partial<SplitItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () =>
    setItems((prev) => [...prev, { name: '', price: 0, contact_ids: [] }]);
  const toggleContact = (i: number, cid: string) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const has = it.contact_ids.includes(cid);
        return {
          ...it,
          contact_ids: has ? it.contact_ids.filter((c) => c !== cid) : [...it.contact_ids, cid],
        };
      }),
    );
  };
  const itemsTotal = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const matches = totalAmount === 0 || Math.abs(itemsTotal - totalAmount) < 0.01;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">
      <div className="bg-sky-50/60 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-800/40 rounded-lg p-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">{t.split.items_how_to_title}</p>
        {t.split.items_how_to_body}
      </div>

      {items.length === 0 && (
        <p className="text-center py-3 text-xs text-slate-400 dark:text-slate-500 italic">
          {t.split.items_empty}
        </p>
      )}

      {items.map((it, i) => (
        <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2.5 space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                {t.split.items_item_label}
              </label>
              <input
                type="text"
                value={it.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                placeholder={t.split.items_item_placeholder}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                {t.split.items_price_label}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={it.price || ''}
                onChange={(e) => updateItem(i, { price: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-24 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="p-1.5 text-slate-400 hover:text-rose-500 self-end"
              aria-label={t.split.items_delete}
              title={t.split.items_delete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              {t.split.items_who_consumed}
            </p>
            <div className="flex flex-wrap gap-1">
              {contacts.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">{t.split.items_no_contacts}</span>
              ) : (
                contacts.map((c) => {
                  const on = it.contact_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(i, c.id)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                        on
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500'
                      }`}
                    >
                      {c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 py-1.5 rounded-md"
      >
        <Plus className="w-3.5 h-3.5" />
        {t.split.items_add}
      </button>

      {items.length > 0 && (
        <div className={`text-xs flex items-center justify-between ${matches ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500'}`}>
          <span>{t.split.items_sum}</span>
          <span className="tabular-nums">
            {formatMoney(itemsTotal, currency)} / {formatMoney(totalAmount, currency)}
          </span>
        </div>
      )}
    </div>
  );
};
