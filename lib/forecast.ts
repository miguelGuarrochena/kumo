export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

export type MonthProgress = {
  dayOfMonth: number;
  daysInMonth: number;
};

export const monthProgress = (now: Date = new Date()): MonthProgress => ({
  dayOfMonth: now.getDate(),
  daysInMonth: daysInMonth(now.getFullYear(), now.getMonth() + 1),
});

/**
 * Proyección lineal: gasto acumulado × (días del mes / días transcurridos).
 * Devuelve null si no hay base para proyectar.
 */
export const projectMonthSpend = (
  monthToDate: number,
  progress: MonthProgress,
): number | null => {
  const { dayOfMonth, daysInMonth: totalDays } = progress;
  if (monthToDate <= 0 || dayOfMonth <= 0 || totalDays <= 0) return null;
  return monthToDate * (totalDays / dayOfMonth);
};

/** Mostrar forecast solo si hay gastos y aún quedan días en el mes. */
export const shouldShowForecast = (
  monthExpenseCount: number,
  progress: MonthProgress,
): boolean =>
  monthExpenseCount >= 1 && progress.dayOfMonth < progress.daysInMonth;
