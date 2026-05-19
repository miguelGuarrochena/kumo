// Utilidades de fecha 100% local — sin pasar por UTC, evita off-by-one
// en bordes de día/mes según la zona horaria del navegador.

/**
 * Normaliza cualquier representación de fecha string a 'YYYY-MM-DD'.
 * - "2026-05-18"             → "2026-05-18"
 * - "2026-05-18T00:00:00Z"   → "2026-05-18"
 * - null / undefined         → ""
 */
export const dayKey = (s: string | null | undefined): string => (s ?? '').slice(0, 10);

/**
 * Construye la "clave de hoy" basada en la fecha local del navegador.
 */
export const todayKey = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/**
 * Parsea un "YYYY-MM-DD" como Date local (NO UTC).
 * Returns null si el string no tiene formato válido.
 */
export const parseLocalDate = (dateStr: string): Date | null => {
  const parts = dayKey(dateStr).split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * Convierte un Date a "YYYY-MM-DD" usando componentes LOCALES (no toISOString).
 */
export const toIsoLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Diferencia en días enteros entre dos fechas YYYY-MM-DD (to - from).
 */
export const daysBetween = (fromKey: string, toKey: string): number => {
  const from = parseLocalDate(fromKey);
  const to = parseLocalDate(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

/**
 * Construye una grilla 6x7 = 42 celdas para mostrar un mes.
 * - La primera celda es el lunes de la semana donde cae el día 1 del mes.
 * - Las celdas fuera del mes muestran días del mes anterior/siguiente con su info real.
 */
export type GridCell = {
  day: number;
  month: number;
  year: number;
  dateStr: string;
};

export const buildGrid = (year: number, month: number): GridCell[] => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const jsDay = firstOfMonth.getDay();         // 0=Dom..6=Sáb
  const firstDayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Lun..7=Dom
  const startOffset = firstDayOfWeek - 1;

  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month - 1, 1 - startOffset + i);
    cells.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dateStr: toIsoLocal(d),
    });
  }
  return cells;
};

/**
 * Suma o resta meses a un "YYYY-MM" y devuelve el resultado en el mismo formato.
 */
export const shiftMonth = (year: number, month: number, delta: number): string => {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
