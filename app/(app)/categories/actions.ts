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
});

export type CategoryFormState = {
  ok: boolean;
  error?: string;
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

  const { error } = parsed.data.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from('categories') as any).update(payload).eq('id', parsed.data.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await (supabase.from('categories') as any).insert(payload);

  if (error) {
    return { ok: false, error: (error as { message?: string }).message ?? 'Error' };
  }

  revalidatePath('/categories');
  return { ok: true };
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
