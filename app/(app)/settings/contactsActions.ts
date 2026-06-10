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

  // El contacto "Yo" (is_self) lo gestiona el sistema. No permitimos crear ni
  // convertir contactos a relationship 'self' a mano: la lógica de splits y
  // notificaciones asume un único self real por (workspace, user).
  if (parsed.data.relationship === 'self') {
    if (!parsed.data.id) {
      return { ok: false, error: 'No podés crear un contacto "Yo" manualmente.' };
    }
    const { data: existing } = await supabase
      .from('notification_contacts')
      .select('is_self')
      .eq('id', parsed.data.id)
      .single();
    if (!(existing as { is_self?: boolean } | null)?.is_self) {
      return { ok: false, error: 'No podés marcar este contacto como "Yo".' };
    }
  }

  const payload = { ...parsed.data, user_id: ctx.userId, workspace_id: ctx.workspaceId };

  const { error } = parsed.data.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from('notification_contacts') as any).update(payload).eq('id', parsed.data.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await (supabase.from('notification_contacts') as any).insert(payload);

  if (error) {
    const code = (error as { code?: string }).code;
    const msg = (error as { message?: string }).message ?? 'Error';
    if (code === '23505' || /duplicate|unique/i.test(msg)) {
      return { ok: false, error: 'Ya existe un contacto "Yo" en este espacio.' };
    }
    return { ok: false, error: msg };
  }

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
 * Crea un contacto rápido sólo con nombre (sin teléfono). Útil para splits
 * donde el user escribe un nombre libre que no existe como contacto todavía.
 * Devuelve el id del contacto creado (o el existente si ya hay uno con ese nombre).
 */
export async function createAdHocContact(name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Nombre vacío' };

  let ctx;
  try { ctx = await requireAdmin(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('notification_contacts')
    .select('id')
    .eq('workspace_id', ctx.workspaceId)
    .ilike('name', trimmed)
    .maybeSingle();
  if (existing) return { ok: true, id: (existing as { id: string }).id };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error } = await (supabase.from('notification_contacts') as any)
    .insert({
      workspace_id: ctx.workspaceId,
      user_id: ctx.userId,
      name: trimmed,
      relationship: 'other',
      // Marcado como sólo-split: no aparece en Settings > Contactos hasta que
      // el user lo "promueva" agregándole teléfono manualmente.
      is_split_only: true,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  revalidatePath('/expenses');
  return { ok: true, id: (created as { id: string }).id };
}

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
