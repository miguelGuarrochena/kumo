import { parseLocalDate } from '@/lib/date';
import { localeTag } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/types';
import type { Filters } from './FiltersSheet';

// Mapea el color de categoría al class del puntito de la lista.
export const COLOR_DOT: Record<string, string> = {
  sky: 'bg-sky-400',
  lavender: 'bg-lavender-400',
  peach: 'bg-peach-300',
  mint: 'bg-mint-400',
  rose: 'bg-rose-300',
};

export function monthShift(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(year: number, month: number, locale: Locale = 'es'): string {
  return new Date(year, month - 1, 1).toLocaleDateString(localeTag(locale), {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDate(dateStr: string, locale: Locale = 'es'): string {
  // parseLocalDate evita el off-by-one que produce `new Date('YYYY-MM-DD')` (UTC).
  return (parseLocalDate(dateStr) ?? new Date(dateStr)).toLocaleDateString(localeTag(locale), {
    day: '2-digit',
    month: 'short',
  });
}

export function formatFullDate(dateStr: string, locale: Locale = 'es'): string {
  return (parseLocalDate(dateStr) ?? new Date(dateStr)).toLocaleDateString(localeTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Construye la URL del endpoint de export respetando los filtros actuales
// (rango de fechas, moneda, pagado/pendiente). El resto se ignora porque
// los gastos exportados son simplemente el subset visible.
export function buildExportUrl(filters: Filters, format: 'xlsx' | 'csv' = 'xlsx'): string {
  const params = new URLSearchParams();
  params.set('format', format);
  if (filters.from)   params.set('from', filters.from);
  if (filters.to)     params.set('to', filters.to);
  if (filters.cur)    params.set('currency', filters.cur);
  if (filters.paid)   params.set('paid', filters.paid);
  if (filters.kind)   params.set('kind', filters.kind);
  return `/api/export/expenses?${params.toString()}`;
}
