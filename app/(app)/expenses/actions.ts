'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/workspace';
import { scheduleExpenseDelete, scheduleExpenseSync } from '@/lib/calendar/scheduleSync';
import { expenseSchema } from '@/lib/schemas';

export type ExpenseFormState = {
  ok: boolean;
  error?: string;
  expenseId?: string;
};

export async function upsertExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const raw = {
    id: (formData.get('id') as string) || undefined,
    category_id: (formData.get('category_id') as string) || null,
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    description: (formData.get('description') as string) || null,
    expense_date: formData.get('expense_date'),
    due_date: (formData.get('due_date') as string) || null,
    is_recurring: formData.get('is_recurring') === 'true',
    recurrence_type: (formData.get('recurrence_type') as string) || null,
    paid: formData.get('paid') === 'true',
    notify_contact_ids: formData.getAll('notify_contact_ids') as string[],
  };

  const parsed = expenseSchema.safeParse(raw);
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
  const payload = { ...parsed.data, user_id: ctx.userId, workspace_id: ctx.workspaceId };

  let expenseId = parsed.data.id ?? null;

  if (parsed.data.id) {
    const { error } = await supabase.from('expenses').update(payload).eq('id', parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: created, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    expenseId = created.id;
  }

  if (expenseId) scheduleExpenseSync(ctx.userId, expenseId);

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');
  revalidatePath('/split');
  return { ok: true, expenseId: expenseId ?? undefined };
}

export async function deleteExpense(id: string): Promise<{ ok: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  scheduleExpenseDelete(ctx.userId, id);
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');
  return { ok: true };
}

export async function togglePaid(id: string, paid: boolean): Promise<{ ok: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').update({ paid }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  scheduleExpenseSync(ctx.userId, id);
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');
  return { ok: true };
}

export async function markExpenseRecurring(
  expenseId: string,
  recurrenceType: 'monthly' | 'weekly' | 'yearly',
): Promise<{ ok: boolean; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('expenses')
    .update({ is_recurring: true, recurrence_type: recurrenceType })
    .eq('id', expenseId)
    .eq('workspace_id', ctx.workspaceId);
  if (error) return { ok: false, error: error.message };
  scheduleExpenseSync(ctx.userId, expenseId);
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');
  return { ok: true };
}
