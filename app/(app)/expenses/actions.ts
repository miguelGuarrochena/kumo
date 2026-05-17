'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN', 'CLP', 'COP', 'BRL', 'GBP'] as const;
const RECURRENCE = ['weekly', 'monthly', 'yearly'] as const;

const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
  currency: z.enum(CURRENCIES),
  description: z.string().max(200).optional().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_recurring: z.coerce.boolean().default(false),
  recurrence_type: z.enum(RECURRENCE).optional().nullable(),
  paid: z.coerce.boolean().default(true),
  notify_contact_ids: z.array(z.string().uuid()).default([]),
});

export type ExpenseFormState = {
  ok: boolean;
  error?: string;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const payload = { ...parsed.data, user_id: user.id };

  const { error } = parsed.data.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from('expenses') as any).update(payload).eq('id', parsed.data.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await (supabase.from('expenses') as any).insert(payload);

  if (error) return { ok: false, error: (error as { message?: string }).message ?? 'Error' };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function togglePaid(id: string, paid: boolean) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('expenses') as any).update({ paid }).eq('id', id);
  revalidatePath('/expenses');
}
