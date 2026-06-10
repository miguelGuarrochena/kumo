import type { Messages } from '@/lib/i18n/types';

export const CATEGORY_PRESET_KEYS = [
  'rent',
  'groceries',
  'utilities',
  'transport',
  'health',
  'other',
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
