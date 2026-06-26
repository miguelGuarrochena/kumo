'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/workspace';

const COLORS = ['sky', 'lavender', 'peach', 'mint', 'rose', 'amber', 'fuchsia', 'emerald', 'indigo', 'slate'] as const;

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nombre requerido').max(40),
  icon: z.string().min(1).max(40),
  color: z.enum(COLORS),
  kind: z.enum(['expense', 'income']).default('expense'),
});

export type CategoryFormState = {
  ok: boolean;
  error?: string;
  id?: string;
};

export async function upsertCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = categorySchema.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    icon: formData.get('icon'),
    color: formData.get('color'),
    kind: formData.get('kind') === 'income' ? 'income' : 'expense',
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
  const payload = { ...parsed.data, user_id: ctx.userId, workspace_id: ctx.workspaceId };

  let newId = parsed.data.id;
  if (parsed.data.id) {
    const { error } = await supabase.from('categories').update(payload).eq('id', parsed.data.id);
    if (error) return categoryError(error);
  } else {
    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select('id')
      .single();
    if (error) return categoryError(error);
    newId = data?.id;
  }

  revalidatePath('/categories');
  revalidatePath('/expenses');
  return { ok: true, id: newId };
}

function categoryError(error: { code?: string; message?: string }): CategoryFormState {
  const msg = error.message ?? 'Error';
  if (error.code === '23505' || /duplicate|unique/i.test(msg)) {
    return { ok: false, error: 'Ya tenés una categoría con ese nombre.' };
  }
  return { ok: false, error: msg };
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/categories');
  return { ok: true };
}
