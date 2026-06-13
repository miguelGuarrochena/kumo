export type ExpenseHistoryRow = {
  description: string | null;
  category_id: string | null;
};

/** Normaliza descripciones para comparar gastos repetidos (ej. "Carrefour  " → "carrefour"). */
export const normalizeExpenseDescription = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * ¿Son "el mismo" gasto a ojos del usuario?
 * Igualdad exacta normalizada, o contención si ambos tienen ≥3 chars.
 */
export const descriptionsMatch = (a: string, b: string): boolean => {
  const na = normalizeExpenseDescription(a);
  const nb = normalizeExpenseDescription(b);
  if (na.length < 2 || nb.length < 2) return false;
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
};

/**
 * Elige la categoría más usada en el historial para una descripción dada.
 * Empate → gana la primera que apareció con mayor frecuencia (orden del historial).
 */
export const pickCategoryFromHistory = (
  description: string,
  history: ExpenseHistoryRow[],
): string | null => {
  const needle = normalizeExpenseDescription(description);
  if (needle.length < 2) return null;

  const counts = new Map<string, number>();
  for (const row of history) {
    if (!row.category_id || !row.description) continue;
    if (!descriptionsMatch(needle, row.description)) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
};
