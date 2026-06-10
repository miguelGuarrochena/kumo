import { localeTag as toLocaleTag } from '@/lib/i18n/locale';
import type { ReminderCal } from './types';

export { toLocaleTag as localeTag };

// Normaliza fechas que puedan venir como "YYYY-MM-DD" o "YYYY-MM-DDTHH:..."
export const dayKey = (s: string | null | undefined): string => (s ?? '').slice(0, 10);

export const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const buildGrid = (year: number, month: number) => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const jsDay = firstOfMonth.getDay(); // 0=Dom..6=Sáb
  const firstDayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Lun..7=Dom
  const startOffset = firstDayOfWeek - 1;

  const cells: { day: number; month: number; year: number; dateStr: string }[] = [];

  for (let i = 0; i < 42; i++) {
    // Construimos cada celda con su offset desde el día 1 del mes — totalmente local, sin pasar por UTC.
    const d = new Date(year, month - 1, 1 - startOffset + i);
    cells.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    });
  }
  return cells;
};

export const shiftMonth = (year: number, month: number, delta: number): string => {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const parseLocalDate = (dateStr: string): Date | null => {
  const parts = dayKey(dateStr).split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const formatDateFull = (dateStr: string, locale = 'es-AR'): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatDateLong = (dateStr: string, locale = 'es-AR'): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

export const daysBetween = (fromKey: string, toKey: string): number => {
  const from = parseLocalDate(fromKey);
  const to = parseLocalDate(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

export const formatMonthLabel = (
  year: number,
  month: number,
  locale = 'es-AR',
  withYear = true,
): string =>
  new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  });

// Iniciales de los días de la semana empezando en lunes, según el locale.
export const weekdayInitials = (locale = 'es-AR'): string[] => {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  // 2024-01-01 fue lunes; recorremos 7 días desde ahí.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2024, 0, 1 + i)).toUpperCase(),
  );
};

export const groupByMonth = (
  items: ReminderCal[],
  locale = 'es-AR',
): Record<string, ReminderCal[]> => {
  const result: Record<string, ReminderCal[]> = {};
  for (const r of items) {
    const date = parseLocalDate(r.reminder_date);
    if (!date) continue;
    const key = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const titleCased = key.charAt(0).toUpperCase() + key.slice(1);
    (result[titleCased] ??= []).push(r);
  }
  return result;
};
