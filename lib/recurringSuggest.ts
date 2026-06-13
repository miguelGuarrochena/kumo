import { descriptionsMatch, normalizeExpenseDescription } from '@/lib/categorySuggest';

export type ExpenseRecurringRow = {
  id: string;
  description: string | null;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
};

export type RecurrenceType = 'monthly' | 'weekly' | 'yearly';

export type RecurringSuggestion = {
  description: string;
  recurrenceType: RecurrenceType;
  matchCount: number;
  latestExpenseId: string;
};

const dayDiff = (a: string, b: string): number =>
  Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

/** Infiere weekly / monthly / yearly a partir de fechas ordenadas. */
export const inferRecurrenceType = (dates: string[]): RecurrenceType | null => {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(dayDiff(sorted[i - 1]!, sorted[i]!));
  }

  const monthlyHits = gaps.filter((g) => g >= 25 && g <= 35).length;
  const weeklyHits = gaps.filter((g) => g >= 6 && g <= 8).length;
  const yearlyHits = gaps.filter((g) => g >= 350 && g <= 380).length;

  if (monthlyHits >= 1 && monthlyHits >= weeklyHits && monthlyHits >= yearlyHits) {
    return 'monthly';
  }
  if (weeklyHits >= 2) return 'weekly';
  if (yearlyHits >= 1) return 'yearly';

  if (dates.length >= 3) {
    const span = dayDiff(sorted[0]!, sorted[sorted.length - 1]!);
    const avgGap = span / (sorted.length - 1);
    if (avgGap >= 20 && avgGap <= 40) return 'monthly';
    if (avgGap >= 5 && avgGap <= 10) return 'weekly';
  }

  return null;
};

type Cluster = {
  description: string;
  rows: ExpenseRecurringRow[];
};

const clusterExpenses = (rows: ExpenseRecurringRow[]): Cluster[] => {
  const clusters: Cluster[] = [];
  for (const row of rows) {
    if (!row.description?.trim()) continue;
    let cluster = clusters.find((c) => descriptionsMatch(c.description, row.description!));
    if (!cluster) {
      cluster = { description: row.description.trim(), rows: [] };
      clusters.push(cluster);
    }
    cluster.rows.push(row);
  }
  return clusters;
};

const amountsCompatible = (amounts: number[]): boolean => {
  if (amounts.length < 2) return true;
  const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  if (avg <= 0) return true;
  return amounts.every((a) => Math.abs(a - avg) / avg <= 0.35);
};

const clusterToSuggestion = (cluster: Cluster): RecurringSuggestion | null => {
  if (cluster.rows.length < 2) return null;
  if (cluster.rows.some((r) => r.is_recurring)) return null;

  const recurrenceType = inferRecurrenceType(cluster.rows.map((r) => r.expense_date));
  if (!recurrenceType) return null;
  if (!amountsCompatible(cluster.rows.map((r) => Number(r.amount)))) return null;

  const sorted = [...cluster.rows].sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  const latest = sorted[0]!;

  return {
    description: cluster.description,
    recurrenceType,
    matchCount: cluster.rows.length,
    latestExpenseId: latest.id,
  };
};

/** Sugerencias globales para el banner en /expenses (máx. 3). */
export const findRecurringCandidates = (
  history: ExpenseRecurringRow[],
  limit = 3,
): RecurringSuggestion[] => {
  const suggestions: RecurringSuggestion[] = [];
  const seen = new Set<string>();

  for (const cluster of clusterExpenses(history)) {
    const suggestion = clusterToSuggestion(cluster);
    if (!suggestion) continue;
    const key = normalizeExpenseDescription(suggestion.description);
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(suggestion);
  }

  return suggestions
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit);
};

/** ¿Este gasto nuevo parece repetirse en el historial? */
export const suggestRecurringForDescription = (
  description: string,
  history: ExpenseRecurringRow[],
): Omit<RecurringSuggestion, 'latestExpenseId'> | null => {
  const trimmed = description.trim();
  if (trimmed.length < 2) return null;

  const matching = history.filter(
    (r) => r.description && descriptionsMatch(trimmed, r.description),
  );
  if (matching.length < 2) return null;
  if (matching.some((r) => r.is_recurring)) return null;

  const recurrenceType = inferRecurrenceType(matching.map((r) => r.expense_date));
  if (!recurrenceType) return null;
  if (!amountsCompatible(matching.map((r) => Number(r.amount)))) return null;

  return {
    description: trimmed,
    recurrenceType,
    matchCount: matching.length,
  };
};
