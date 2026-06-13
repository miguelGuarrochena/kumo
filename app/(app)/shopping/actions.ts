'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/workspace';
import { shoppingItemSchema } from '@/lib/schemas';

export async function addItem(formData: FormData) {
  const parsed = shoppingItemSchema.safeParse({
    list_name: formData.get('list_name') || 'Supermercado',
    name: formData.get('name'),
    quantity: (formData.get('quantity') as string) || null,
    unit: (formData.get('unit') as string) || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();

  // Posición = última + 1 dentro de la lista del workspace
  const { data: last } = await supabase
    .from('shopping_items')
    .select('position')
    .eq('workspace_id', ctx.workspaceId)
    .eq('list_name', parsed.data.list_name)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((last as { position?: number } | null)?.position ?? -1) + 1;

  const { error } = await supabase.from('shopping_items').insert({
    user_id: ctx.userId,
    workspace_id: ctx.workspaceId,
    list_name: parsed.data.list_name,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    position,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/shopping');
  return { ok: true };
}

export async function updateItem(
  id: string,
  patch: { name?: string; quantity?: string | null; unit?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase.from('shopping_items').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/shopping');
  return { ok: true };
}

export async function toggleBought(id: string, bought: boolean) {
  const supabase = await createClient();
  await supabase.from('shopping_items').update({ bought }).eq('id', id);
  revalidatePath('/shopping');
}

export async function removeItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('shopping_items').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/shopping');
  return { ok: true };
}

export async function clearBought(listName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('user_id', user.id)
    .eq('list_name', listName)
    .eq('bought', true);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/shopping');
  return { ok: true };
}

export async function createList(name: string) {
  // Las listas son virtuales — se "crean" cuando agregás el primer item.
  // Esta action es un no-op pero útil para validar el nombre.
  if (!name.trim()) return { ok: false, error: 'Nombre vacío' };
  revalidatePath('/shopping');
  return { ok: true };
}
