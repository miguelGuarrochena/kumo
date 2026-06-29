'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/workspace';
import { EXPENSE_CURRENCIES } from '@/lib/schemas';
import { categoryNamesMatch } from '@/lib/categoryLabels';

export type ImportRow = {
  date: string; // YYYY-MM-DD
  amount: number;
  description?: string | null;
  category?: string | null; // nombre libre
  kind: 'expense' | 'income';
  currency: string;
};

export type ImportResult = {
  ok: boolean;
  error?: string;
  imported: number;
  skipped: number;
  createdCategories: number;
};

const COLORS = ['sky', 'lavender', 'peach', 'mint', 'rose', 'amber', 'fuchsia', 'emerald', 'indigo', 'slate'] as const;
const MAX_ROWS = 5000;

export async function importExpenses(rows: ImportRow[]): Promise<ImportResult> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message, imported: 0, skipped: 0, createdCategories: 0 };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'Sin filas para importar', imported: 0, skipped: 0, createdCategories: 0 };
  }
  if (rows.length > MAX_ROWS) {
    return { ok: false, error: `Demasiadas filas (máximo ${MAX_ROWS})`, imported: 0, skipped: 0, createdCategories: 0 };
  }

  const supabase = await createClient();

  // 1) Categorías existentes del workspace.
  const { data: existingCats } = await supabase
    .from('categories')
    .select('id, name, kind')
    .eq('workspace_id', ctx.workspaceId);
  type Cat = { id: string; name: string; kind: 'expense' | 'income' };
  const cats = ((existingCats ?? []) as Cat[]).slice();

  const findCat = (name: string, kind: 'expense' | 'income') =>
    cats.find((c) => (c.kind ?? 'expense') === kind && categoryNamesMatch(c.name, name));

  // 2) Crear las categorías que falten (por nombre + tipo).
  const toCreate = new Map<string, { name: string; kind: 'expense' | 'income' }>();
  for (const r of rows) {
    const name = (r.category ?? '').trim();
    if (!name) continue;
    const kind = r.kind === 'income' ? 'income' : 'expense';
    if (!findCat(name, kind)) {
      const key = `${kind}::${name.toLowerCase()}`;
      if (!toCreate.has(key)) toCreate.set(key, { name: name.slice(0, 40), kind });
    }
  }

  let createdCategories = 0;
  if (toCreate.size > 0) {
    let i = 0;
    const newRows = Array.from(toCreate.values()).map((c) => ({
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      name: c.name,
      icon: 'wallet',
      color: COLORS[i++ % COLORS.length],
      kind: c.kind,
    }));
    const { data: created, error } = await supabase.from('categories').insert(newRows).select('id, name, kind');
    if (!error) {
      for (const c of (created ?? []) as Cat[]) cats.push(c);
      createdCategories = (created ?? []).length;
    }
  }

  // 3) Armar las filas válidas de movimientos.
  type ExpenseInsert = {
    workspace_id: string;
    user_id: string;
    amount: number;
    currency: string;
    kind: 'expense' | 'income';
    description: string | null;
    expense_date: string;
    category_id: string | null;
    paid: boolean;
  };
  const validCurrencies = EXPENSE_CURRENCIES as readonly string[];
  const payload: ExpenseInsert[] = [];
  let skipped = 0;
  for (const r of rows) {
    const amount = Number(r.amount);
    const date = String(r.date ?? '');
    if (!(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      skipped++;
      continue;
    }
    const kind = r.kind === 'income' ? 'income' : 'expense';
    const currency = validCurrencies.includes(r.currency) ? r.currency : 'ARS';
    const catName = (r.category ?? '').trim();
    const cat = catName ? findCat(catName, kind) : null;
    payload.push({
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      amount,
      currency,
      kind,
      description: (r.description ?? '').toString().trim().slice(0, 200) || null,
      expense_date: date,
      category_id: cat?.id ?? null,
      paid: true,
    });
  }

  if (payload.length === 0) {
    return { ok: false, error: 'Ninguna fila válida para importar', imported: 0, skipped, createdCategories };
  }

  // 4) Insertar en lotes.
  const CHUNK = 500;
  let imported = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from('expenses').insert(chunk);
    if (error) return { ok: false, error: error.message, imported, skipped, createdCategories };
    imported += chunk.length;
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/metrics');
  revalidatePath('/budgets');
  return { ok: true, imported, skipped, createdCategories };
}
