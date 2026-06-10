export const dayKey = (s: string | null | undefined): string => (s ?? '').slice(0, 10);

export const todayKey = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export const parseLocalDate = (dateStr: string): Date | null => {
  const parts = dayKey(dateStr).split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const toIsoLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const daysBetween = (fromKey: string, toKey: string): number => {
  const from = parseLocalDate(fromKey);
  const to = parseLocalDate(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

export type GridCell = {
  day: number;
  month: number;
  year: number;
  dateStr: string;
};

export const buildGrid = (year: number, month: number): GridCell[] => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const jsDay = firstOfMonth.getDay();
  const firstDayOfWeek = jsDay === 0 ? 7 : jsDay;
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

export const shiftMonth = (year: number, month: number, delta: number): string => {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
