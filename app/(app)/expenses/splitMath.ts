import type { SplitState } from './splitTypes';

// Redondea a 2 decimales y devuelve string sin trailing zeros.
export const trim = (n: number): string => {
  if (!isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
};

// Cuando se agrega un participante en modo porcentaje/fijo, le asignamos el
// remaining (cap - suma de los demás) para que el total cierre solo.
export const autocompleteOnAdd = (s: SplitState, newId: string, totalAmount: number): SplitState => {
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

// Computar splits dado un state + totalAmount.
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
