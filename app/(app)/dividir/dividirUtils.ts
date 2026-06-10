import { localeTag } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/types';

// Id estable de cliente para keys de React y referencias sin índice.
export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const formatMoney = (n: number, ccy: string, locale: Locale = 'es'): string => {
  try {
    return new Intl.NumberFormat(localeTag(locale), { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${ccy} ${n.toFixed(2)}`;
  }
};

// Redondea a 2 decimales y devuelve string sin trailing zeros
// (15.50 → "15.5", 33.333... → "33.33").
export const trimNumber = (n: number): string => {
  if (!isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
};
