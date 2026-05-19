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
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();

  // No permitir borrar el contacto propio (is_self)
  const { data: contact } = await supabase
    .from('notification_contacts')
    .select('is_self')
    .eq('id', id)
    .single();

  if ((contact as { is_self?: boolean } | null)?.is_self) {
    return { ok: false, error: 'No se puede borrar tu propio contacto.' };
  }

  const { error } = await supabase.from('notification_contacts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}
