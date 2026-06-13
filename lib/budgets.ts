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

/** Estado del presupuesto según el % gastado (pct = spent / amount). */
export const budgetStatus = (pct: number): BudgetStatus => {
  if (pct >= 1) return 'over';
  if (pct >= WARN_THRESHOLD) return 'warn';
  return 'ok';
};
