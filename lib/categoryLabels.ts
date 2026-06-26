import type { Messages } from '@/lib/i18n/types';

/**
 * Categorías sembradas al crear un workspace desde la app (`lib/workspace.ts`).
 * IMPORTANTE: mantener sincronizado con el trigger SQL `handle_new_user`
 * (supabase/migrations), que siembra el equivalente del lado de la base.
 */
export const DEFAULT_CATEGORIES = [
  { name: 'Alquiler',     icon: 'home',            color: 'sky' },
  { name: 'Supermercado', icon: 'shopping-cart',   color: 'mint' },
  { name: 'Servicios',    icon: 'zap',             color: 'peach' },
  { name: 'Transporte',   icon: 'car',             color: 'lavender' },
  { name: 'Salud',        icon: 'heart',           color: 'rose' },
  { name: 'Otros',        icon: 'more-horizontal', color: 'slate' },
] as const;

/**
 * Categorías de ingreso sembradas al crear un workspace.
 * Mantener sincronizado con el trigger SQL `handle_new_user`.
 */
export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Sueldo',       icon: 'briefcase',       color: 'mint' },
  { name: 'Freelance',    icon: 'sparkles',        color: 'sky' },
  { name: 'Venta',        icon: 'credit-card',     color: 'peach' },
  { name: 'Inversiones',  icon: 'piggy-bank',      color: 'lavender' },
  { name: 'Regalo',       icon: 'gift',            color: 'rose' },
  { name: 'Otros',        icon: 'more-horizontal', color: 'slate' },
] as const;

export const CATEGORY_PRESET_KEYS = [
  'rent',
  'groceries',
  'utilities',
  'transport',
  'health',
  'other',
  // ingresos
  'salary',
  'freelance',
  'sale',
  'investments',
  'gift',
] as const;

export type CategoryPresetKey = (typeof CATEGORY_PRESET_KEYS)[number];

const NAME_TO_PRESET: Record<string, CategoryPresetKey> = {
  alquiler: 'rent',
  rent: 'rent',
  supermercado: 'groceries',
  groceries: 'groceries',
  grocery: 'groceries',
  servicios: 'utilities',
  utilities: 'utilities',
  services: 'utilities',
  transporte: 'transport',
  transport: 'transport',
  transportation: 'transport',
  salud: 'health',
  health: 'health',
  otros: 'other',
  other: 'other',
  others: 'other',
  // ingresos
  sueldo: 'salary',
  salario: 'salary',
  salary: 'salary',
  freelance: 'freelance',
  venta: 'sale',
  ventas: 'sale',
  sale: 'sale',
  sales: 'sale',
  inversiones: 'investments',
  inversion: 'investments',
  investments: 'investments',
  investment: 'investments',
  regalo: 'gift',
  gift: 'gift',
};

export const getCategoryPresetKey = (name: string): CategoryPresetKey | null =>
  NAME_TO_PRESET[name.trim().toLowerCase()] ?? null;

export const categoryDisplayName = (name: string, t: Messages): string => {
  const key = getCategoryPresetKey(name);
  if (key) return t.categories.presets[key];
  return name;
};

/** Match category names across locales (e.g. OCR "Groceries" vs DB "Supermercado"). */
export const categoryNamesMatch = (a: string, b: string): boolean => {
  const la = a.trim().toLowerCase();
  const lb = b.trim().toLowerCase();
  if (la === lb || la.includes(lb) || lb.includes(la)) return true;
  const ka = getCategoryPresetKey(a);
  const kb = getCategoryPresetKey(b);
  return ka !== null && ka === kb;
};
