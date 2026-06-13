import { convertAmount, type Currency } from '@/lib/currency';

export type ExpenseLite = {
  amount: number;
  currency: string;
  category_id: string | null;
};

export type SpendResult = {
  spent: number;
  rateMissing: boolean;
};

/**
 * Suma el gasto del set de expenses para una categoría (o total si categoryId
 * es null), convertido a `currency`. Si falta alguna tasa, no suma ese monto
 * pero marca `rateMissing` para que la UI avise.
 */
export const computeSpend = (
  expenses: ExpenseLite[],
  categoryId: string | null,
  currency: Currency,
  rates: Partial<Record<Currency, number>>,
): SpendResult => {
  const relevant = categoryId === null
    ? expenses
    : expenses.filter((e) => e.category_id === categoryId);

  let spent = 0;
  let rateMissing = false;
  for (const e of relevant) {
    const converted = convertAmount(Number(e.amount), e.currency as Currency, currency, rates);
    if (converted === null) rateMissing = true;
    else spent += converted;
  }
  return { spent, rateMissing };
};

export type BudgetStatus = 'ok' | 'warn' | 'over';

export const WARN_THRESHOLD = 0.8;

export type BudgetAlertThreshold = '80' | '100';

/** Clave del mes actual (YYYY-MM) para alertas y agregaciones mensuales. */
export const currentBudgetMonthKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Umbral de alerta a enviar, o null si no corresponde.
 * Si se salta directo a >100%, solo manda 100 (no 80).
 */
export const pickBudgetAlertThreshold = (
  pct: number,
  alreadySent: Set<BudgetAlertThreshold>,
): BudgetAlertThreshold | null => {
  if (pct >= 1 && !alreadySent.has('100')) return '100';
  if (pct >= WARN_THRESHOLD && pct < 1 && !alreadySent.has('80')) return '80';
  return null;
};

/** Estado del presupuesto según el % gastado (pct = spent / amount). */
export const budgetStatus = (pct: number): BudgetStatus => {
  if (pct >= 1) return 'over';
  if (pct >= WARN_THRESHOLD) return 'warn';
  return 'ok';
};
