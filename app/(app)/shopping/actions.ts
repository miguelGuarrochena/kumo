'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const itemSchema = z.object({
  list_name: z.string().min(1).max(40),
  name: z.string().min(1, 'Nombre requerido').max(100),
  quantity: z.string().max(40).nullable().optional(),
});

export async function addItem(formData: FormData) {
  const parsed = itemSchema.safeParse({
    list_name: formData.get('list_name') || 'Supermercado',
    name: formData.get('name'),
    quantity: (formData.get('quantity') as string) || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Posición = última + 1 dentro de la lista
  const { data: last } = await supabase
    .from('shopping_items')
    .select('position')
    .eq('user_id', user.id)
    .eq('list_name', parsed.data.list_name)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase.from('shopping_items').insert({
    user_id: user.id,
    list_name: parsed.data.list_name,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    position,
  });

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
