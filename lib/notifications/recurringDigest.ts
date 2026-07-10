// Arma el cuerpo del push que avisa de gastos/ingresos recurrentes recién
// generados por el cron. Función pura → testeable sin tocar la DB ni el push.

export type GeneratedRecurring = {
  description: string | null;
  amount: number;
  currency: string;
  kind: 'expense' | 'income';
};

/**
 * Devuelve el texto del aviso para un conjunto de recurrentes de UN usuario.
 * - 1 sola fila → detalle ("Se registró tu gasto recurrente: Alquiler · 1000 ARS").
 * - Varias → resumen, con el sustantivo correcto según haya gastos, ingresos
 *   o una mezcla ("movimientos").
 */
export const buildRecurringPushBody = (rows: GeneratedRecurring[]): string => {
  if (rows.length === 1) {
    const r = rows[0]!;
    const label = r.kind === 'income' ? 'ingreso' : 'gasto';
    const desc = r.description ?? (r.kind === 'income' ? 'Ingreso' : 'Gasto');
    return `Se registró tu ${label} recurrente: ${desc} · ${r.amount} ${r.currency}`;
  }

  const hasIncome = rows.some((r) => r.kind === 'income');
  const hasExpense = rows.some((r) => r.kind !== 'income');
  const noun = !hasIncome ? 'gasto' : !hasExpense ? 'ingreso' : 'movimiento';
  return `Se registraron ${rows.length} ${noun}s recurrentes de este período`;
};
