import type { Database } from '@/lib/supabase/database.types';

export type Item = Database['public']['Tables']['shopping_items']['Row'];

export const DEFAULT_LISTS = ['Supermercado', 'Farmacia', 'Ferretería'];

export const UNITS = [
  { value: '',       label: 'un.',  full: 'Unidad' },
  { value: 'kg',     label: 'kg',   full: 'Kilos' },
  { value: 'g',      label: 'g',    full: 'Gramos' },
  { value: 'L',      label: 'L',    full: 'Litros' },
  { value: 'ml',     label: 'ml',   full: 'Mililitros' },
  { value: 'paq.',   label: 'paq.', full: 'Paquete' },
  { value: 'docena', label: 'doc.', full: 'Docena' },
] as const;

export const formatQuantity = (qty: string | null, unit: string | null): string => {
  const q = (qty ?? '').trim();
  const u = (unit ?? '').trim();
  if (!q && !u) return '';
  if (!q) return u;
  if (!u || u === 'un.') return q;
  return `${q} ${u}`;
};
