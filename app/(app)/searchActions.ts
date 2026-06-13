'use server';

import { createClient } from '@/lib/supabase/server';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { categoryDisplayName } from '@/lib/categoryLabels';
import { localeTag } from '@/lib/i18n/locale';

export type SearchResult = {
  type: 'expense' | 'reminder' | 'shopping' | 'category';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  // Metadata visual opcional
  color?: string;
  icon?: string;
};

export type SearchResponse = {
  ok: boolean;
  results?: SearchResult[];
  error?: string;
};

const LIMIT_PER_TYPE = 5;

type ExpenseHit = {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  categories: { name: string; color: string } | null;
};
type ReminderHit = { id: string; title: string; reminder_date: string; reminder_type: string };
type ShoppingHit = {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  list_name: string;
  bought: boolean;
};
type CategoryHit = { id: string; name: string; icon: string; color: string };

/**
 * Búsqueda global. Filtra por query en gastos (description),
 * recordatorios (title), shopping items (name) y categorías (name).
 *
 * RLS de Supabase ya asegura que solo veas data del workspace activo.
 */
export const searchEverywhere = async (query: string): Promise<SearchResponse> => {
  const q = query.trim();
  if (q.length < 2) return { ok: true, results: [] };

  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const tag = localeTag(locale);

  const supabase = await createClient();
  const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`;

  try {
    const [expensesRes, remindersRes, shoppingRes, categoriesRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('id, description, amount, currency, expense_date, categories(name, color)')
        .ilike('description', pattern)
        .order('expense_date', { ascending: false })
        .limit(LIMIT_PER_TYPE),
      supabase
        .from('reminders')
        .select('id, title, reminder_date, reminder_type')
        .ilike('title', pattern)
        .order('reminder_date', { ascending: false })
        .limit(LIMIT_PER_TYPE),
      supabase
        .from('shopping_items')
        .select('id, name, quantity, unit, list_name, bought')
        .ilike('name', pattern)
        .order('created_at', { ascending: false })
        .limit(LIMIT_PER_TYPE),
      supabase
        .from('categories')
        .select('id, name, icon, color')
        .ilike('name', pattern)
        .order('name', { ascending: true })
        .limit(LIMIT_PER_TYPE),
    ]);

    const results: SearchResult[] = [];

    for (const e of (expensesRes.data ?? []) as unknown as ExpenseHit[]) {
      results.push({
        type: 'expense',
        id: e.id,
        title: e.description ?? (e.categories?.name ? categoryDisplayName(e.categories.name, t) : null) ?? t.expenses.default_name,
        subtitle: `${formatAmount(e.amount, e.currency, tag)} · ${e.expense_date}`,
        href: '/expenses?view=all',
        color: e.categories?.color,
      });
    }

    for (const r of (remindersRes.data ?? []) as ReminderHit[]) {
      results.push({
        type: 'reminder',
        id: r.id,
        title: r.title,
        subtitle: `${labelForType(r.reminder_type, t)} · ${r.reminder_date}`,
        href: `/calendar?month=${r.reminder_date.slice(0, 7)}`,
      });
    }

    for (const s of (shoppingRes.data ?? []) as ShoppingHit[]) {
      const qty = s.quantity ? `${s.quantity}${s.unit ? ' ' + s.unit : ''}` : '';
      const status = s.bought
        ? `✓ ${t.command.shopping_bought}`
        : t.command.shopping_pending;
      results.push({
        type: 'shopping',
        id: s.id,
        title: s.name,
        subtitle: [qty, s.list_name, status].filter(Boolean).join(' · '),
        href: '/shopping',
      });
    }

    for (const c of (categoriesRes.data ?? []) as CategoryHit[]) {
      results.push({
        type: 'category',
        id: c.id,
        title: categoryDisplayName(c.name, t),
        subtitle: t.command.type_category,
        href: '/categories',
        color: c.color,
        icon: c.icon,
      });
    }

    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};

const formatAmount = (amount: number, currency: string, locale: string) =>
  `${currency} ${Number(amount).toLocaleString(locale, { minimumFractionDigits: 2 })}`;

const labelForType = (
  type: string,
  t: Awaited<ReturnType<typeof getMessages>>,
) =>
  type === 'medical'
    ? t.calendar.type_medical
    : type === 'birthday'
      ? t.calendar.type_birthday
      : t.command.type_reminder;
