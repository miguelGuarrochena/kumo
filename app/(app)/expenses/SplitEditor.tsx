'use client';

// SplitEditor: cuerpo controlado del editor de división, embebido inline
// dentro del form de gasto (ExpenseSheet). El estado del split se controla
// desde afuera y se guarda junto con el gasto en el mismo submit, así no
// hay un segundo paso para dividir.

import { useMemo } from 'react';
import { Select } from '@/components/Select';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import type { ContactLite, SplitItem, SplitMode, SplitState } from './splitTypes';
import { autocompleteOnAdd, trim } from './splitMath';
import { ParticipantsSection } from './ParticipantsSection';
import { SplitItemsEditor } from './SplitItemsEditor';
import { SplitPreview } from './SplitPreview';

export type { ContactLite, SplitItem, SplitMode, SplitState } from './splitTypes';
export { emptySplitState } from './splitTypes';
export { computeSplits, isSumOk } from './splitMath';
export { SplitPreview } from './SplitPreview';

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
  const { t, locale } = useT();
  const setMode = (mode: SplitMode) => {
    // Al cambiar de modo reseteamos los valores específicos del modo
    // (porcentajes/montos/items) para no arrastrar datos que no aplican.
    setState((s) => ({
      ...s,
      mode,
      values: {},
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
          const currentOthersSum = others.reduce(
            (sum, id) => sum + (parseFloat(next.values[id] ?? '0') || 0),
            0,
          );
          if (currentOthersSum === 0) {
            const each = remaining / others.length;
            for (const id of others) next.values[id] = trim(each);
          } else {
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

      {/* Modo (la sección de participantes depende del modo) */}
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
            ? t.split.mode_equal_each.replace('{amount}', formatMoney(totalAmount / state.participantIds.length, currency, locale))
            : state.mode === 'equal'      ? t.split.mode_equal_hint
            : state.mode === 'percentage' ? t.split.mode_percentage_hint
            : state.mode === 'fixed'      ? t.split.mode_fixed_hint
            : state.mode === 'items'      ? t.split.mode_items_hint
            : t.split.mode_choose}
        </p>
      </div>

      {/* Participantes + valores integrados (cuando no es modo items ni null) */}
      {state.mode !== null && state.mode !== 'items' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t.split.divide_between}
          </label>
          <ParticipantsSection
            contacts={contacts}
            participantIds={state.participantIds}
            values={state.values}
            setValue={setValue}
            mode={state.mode}
            totalAmount={totalAmount}
            currency={currency}
            onToggle={toggleParticipant}
            onAdd={addParticipant}
          />
        </div>
      )}

      {/* Modo items tiene su propio editor */}
      {state.mode === 'items' && (
        <SplitItemsEditor
          items={state.items}
          setItems={setItems}
          contacts={contacts}
          totalAmount={totalAmount}
          currency={currency}
        />
      )}

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
