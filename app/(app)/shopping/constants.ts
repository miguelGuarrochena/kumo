import type { Database } from '@/lib/supabase/database.types';

export type Item = Database['public']['Tables']['shopping_items']['Row'];

export const DEFAULT_LISTS = ['Supermercado', 'Farmacia', 'Ferretería'] as const;
export type DefaultListName = typeof DEFAULT_LISTS[number];

export const isDefaultListName = (list: string): list is DefaultListName =>
  DEFAULT_LISTS.includes(list as DefaultListName);

export const UNITS = [
  { value: '',       label: 'un.',  i18nKey: 'unit_each' },
  { value: 'kg',     label: 'kg',   i18nKey: 'unit_kg' },
  { value: 'g',      label: 'g',    i18nKey: 'unit_g' },
  { value: 'L',      label: 'L',    i18nKey: 'unit_l' },
  { value: 'ml',     label: 'ml',   i18nKey: 'unit_ml' },
  { value: 'paq.',   label: 'paq.', i18nKey: 'unit_pack' },
  { value: 'docena', label: 'doc.', i18nKey: 'unit_dozen' },
] as const;

export const formatQuantity = (qty: string | null, unit: string | null): string => {
  const q = (qty ?? '').trim();
  const u = (unit ?? '').trim();
  if (!q && !u) return '';
  if (!q) return u;
  if (!u || u === 'un.') return q;
  return `${q} ${u}`;
};
