'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/workspace';

const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN', 'CLP', 'COP', 'BRL', 'GBP'] as const;

const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  // category_id vacío => presupuesto total del mes.
  category_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0').max(999_999_999),
  currency: z.enum(CURRENCIES),
});

export type BudgetFormState = { ok: boolean; error?: string };

export async function upsertBudget(
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const rawCategory = formData.get('category_id');
  const parsed = budgetSchema.safeParse({
    id: formData.get('id') || undefined,
    category_id: rawCategory ? String(rawCategory) : null,
    amount: formData.get('amount'),
    currency: formData.get('currency') || 'ARS',
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  const payload = {
    workspace_id: ctx.workspaceId,
    category_id: parsed.data.category_id ?? null,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    updated_at: new Date().toISOString(),
  };

  const { error } = parsed.data.id
    ? await supabase.from('budgets').update(payload).eq('id', parsed.data.id)
    : await supabase.from('budgets').insert(payload);

  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message ?? '')) {
      return { ok: false, error: 'Ya existe un presupuesto para eso.' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<BudgetFormState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { ok: true };
}
