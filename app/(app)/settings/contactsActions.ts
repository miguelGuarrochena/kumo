'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/workspace';

const RELATIONSHIPS = ['self', 'partner', 'child', 'parent', 'sibling', 'friend', 'other'] as const;

const contactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nombre requerido').max(60),
  phone: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .transform((v) => {
      if (!v) return null;
      // Normalizo: quito todo lo que no sea dígito
      const digits = v.replace(/\D/g, '');
      return digits.length > 0 ? digits : null;
    }),
  relationship: z.enum(RELATIONSHIPS).default('other'),
});

export type ContactFormState = { ok: boolean; error?: string };

export async function upsertContact(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    id: (formData.get('id') as string) || undefined,
    name: formData.get('name'),
    phone: formData.get('phone'),
    relationship: formData.get('relationship') || 'other',
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
    ? await (supabase.from('notification_contacts') as any).update(payload).eq('id', parsed.data.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await (supabase.from('notification_contacts') as any).insert(payload);

  if (error) return { ok: false, error: (error as { message?: string }).message ?? 'Error' };

  revalidatePath('/settings');
  return { ok: true };
}

export async function deleteContact(id: string): Promise<ContactFormState> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();

  // Si es is_self, solo permitimos borrarlo si hay más de uno.
  // Esto cubre el caso de duplicados generados por el bug del bootstrap loop.
  const { data: contact } = await supabase
    .from('notification_contacts')
    .select('is_self')
    .eq('id', id)
    .single();

  if ((contact as { is_self?: boolean } | null)?.is_self) {
    const { count } = await supabase
      .from('notification_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)
      .eq('is_self', true);
    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'No podés borrar tu único contacto. Editalo para cambiar nombre/número.' };
    }
  }

  const { error } = await supabase.from('notification_contacts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}

/**
 * Limpia duplicados de contactos is_self generados por el bootstrap loop.
 * Devuelve cuántos borró.
 */
export async function cleanupDuplicateSelfContacts(): Promise<{ ok: boolean; deleted?: number; error?: string }> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cleanup_duplicate_self_contacts', { ws_id: ctx.workspaceId });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true, deleted: (data as number) ?? 0 };
}
