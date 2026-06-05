'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentWorkspace, requireAdmin, setActiveWorkspace } from '@/lib/workspace';
import type { WorkspaceRole } from '@/lib/supabase/database.types';

const inviteSchema = z.object({
  email: z.string().email('Email inválido').max(120),
  role: z.enum(['admin', 'reader']).default('reader'),
});

const renameSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(60),
});

export type ActionState = { ok: boolean; error?: string };

/**
 * Genera un invite con un token único y lo guarda en la DB.
 * Devuelve el link para que el admin lo pueda compartir manualmente.
 * (En una futura iteración, podemos disparar un email desde acá.)
 */
export const createInvite = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { inviteLink?: string }> => {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role') || 'reader',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  let ctx;
  try { ctx = await requireAdmin(); } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const token = randomBytes(24).toString('hex');
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('workspace_invites') as any).insert({
    workspace_id: ctx.workspaceId,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    token,
    invited_by: ctx.userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');

  // Construyo el link con el dominio del request (en client lo armamos)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';
  return { ok: true, inviteLink: `${origin}/accept-invite?token=${token}` };
};

export const revokeInvite = async (id: string): Promise<ActionState> => {
  try { await requireAdmin(); } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('workspace_invites').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
};

export const removeMember = async (userId: string): Promise<ActionState> => {
  let ctx;
  try { ctx = await requireAdmin(); } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  // No permitir que el owner se quite a sí mismo del workspace
  if (userId === ctx.ownerId) {
    return { ok: false, error: 'El owner no puede sacarse del workspace.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', ctx.workspaceId)
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
};

export const changeMemberRole = async (
  userId: string,
  role: WorkspaceRole,
): Promise<ActionState> => {
  let ctx;
  try { ctx = await requireAdmin(); } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (userId === ctx.ownerId) {
    return { ok: false, error: 'El owner siempre es admin.' };
  }
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('workspace_members') as any)
    .update({ role })
    .eq('workspace_id', ctx.workspaceId)
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
};

export const renameWorkspace = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const parsed = renameSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  let ctx;
  try { ctx = await requireAdmin(); } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('workspaces') as any)
    .update({ name: parsed.data.name })
    .eq('id', ctx.workspaceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
};

/**
 * Borra un workspace por completo. Solo el OWNER puede.
 * No permite borrar el único workspace del usuario (quedaría huérfano).
 * El cascade de Postgres se encarga de borrar todas las filas asociadas
 * (expenses, reminders, shopping, categories, contacts, members, invites).
 */
export const deleteWorkspace = async (workspaceId: string): Promise<ActionState> => {
  const ctx = await getCurrentWorkspace();
  const supabase = await createClient();

  // Solo el owner del workspace puede borrarlo
  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id, name')
    .eq('id', workspaceId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRow = ws as any;
  if (!wsRow) return { ok: false, error: 'No encontrado' };
  if (wsRow.owner_id !== ctx.userId) {
    return { ok: false, error: 'Solo el dueño puede eliminar' };
  }

  // No puede borrar su único espacio
  const { count } = await supabase
    .from('workspace_members')
    .select('workspace_id', { count: 'exact', head: true })
    .eq('user_id', ctx.userId);
  if ((count ?? 0) <= 1) {
    return { ok: false, error: 'Es tu único espacio' };
  }

  // Si están borrando el activo, primero limpiamos la cookie así getCurrentWorkspace
  // cae al fallback (otro espacio del que sean miembros).
  if (workspaceId === ctx.workspaceId) {
    const c = await cookies();
    c.delete('workspace_id');
  }

  const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
};

export const switchWorkspace = async (workspaceId: string): Promise<ActionState> => {
  // Verificamos que el usuario sea miembro del workspace destino
  const ctx = await getCurrentWorkspace();
  if (!ctx) return { ok: false, error: 'No autenticado' };

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', ctx.userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!membership) return { ok: false, error: 'No sos miembro de ese workspace' };

  await setActiveWorkspace(workspaceId);
  revalidatePath('/', 'layout');
  return { ok: true };
};

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(60),
});

/**
 * Crea un workspace nuevo del cual el user actual es owner + admin.
 * Automáticamente lo deja como workspace activo y le crea categorías default.
 */
export const createWorkspace = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { workspaceId?: string }> => {
  const parsed = createSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ws, error: wsErr } = await (supabase.from('workspaces') as any)
    .insert({ name: parsed.data.name, owner_id: user.id })
    .select('id')
    .single();
  if (wsErr) return { ok: false, error: wsErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memErr } = await (supabase.from('workspace_members') as any).insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'admin',
  });
  if (memErr) return { ok: false, error: memErr.message };

  // Categorías default para el nuevo workspace
  const defaults = [
    { name: 'Alquiler',     icon: 'home',         color: 'sky' },
    { name: 'Supermercado', icon: 'shopping-cart', color: 'mint' },
    { name: 'Servicios',    icon: 'zap',          color: 'peach' },
    { name: 'Transporte',   icon: 'car',          color: 'lavender' },
    { name: 'Salud',        icon: 'heart',        color: 'rose' },
    { name: 'Otros',        icon: 'more-horizontal', color: 'slate' },
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('categories') as any).insert(
    defaults.map((d) => ({ ...d, user_id: user.id, workspace_id: ws.id })),
  );

  // user_settings y contacto "Yo" para el nuevo workspace (solo si no existen ya)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notification_contacts') as any).insert({
    workspace_id: ws.id,
    user_id: user.id,
    name: 'Yo',
    relationship: 'self',
    is_self: true,
  });

  await setActiveWorkspace(ws.id);
  revalidatePath('/', 'layout');
  return { ok: true, workspaceId: ws.id };
};
