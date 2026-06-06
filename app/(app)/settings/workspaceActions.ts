'use server';

import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentWorkspace, requireAdmin, setActiveWorkspace, findCurrentWorkspace } from '@/lib/workspace';
import { sendEmail } from '@/lib/email';
import { renderInviteEmail } from '@/lib/email/templates';
import type { WorkspaceRole } from '@/lib/supabase/database.types';

const inviteSchema = z.object({
  email: z.string().email('Email inválido').max(120),
  role: z.enum(['admin', 'reader']).default('reader'),
});

const renameSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(60),
});

const metaSchema = z.object({
  name:  z.string().min(1, 'Nombre requerido').max(60).optional(),
  icon:  z.string().min(1).max(40).optional(),
  color: z.string().min(1).max(20).optional(),
});

export type ActionState = { ok: boolean; error?: string };

/**
 * Genera un invite con un token único, lo guarda en la DB y manda el email
 * con el link de aceptación. Si el email falla (provider down, env vars
 * faltantes), igual devuelve el link para que el admin lo comparta a mano.
 */
export const createInvite = async (
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { inviteLink?: string; emailSent?: boolean; emailError?: string }> => {
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

  // Origin para el link — preferimos el header del request (más preciso que env)
  let origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) origin = `${proto}://${host}`;
  } catch {
    // En algunos contextos headers() no está disponible — usamos el env
  }
  const inviteLink = `${origin}/accept-invite?token=${token}`;

  // Mando el email. Si falla, no rompemos el flow — el admin puede copiar
  // el link manualmente desde la UI.
  const { data: inviter } = await supabase.auth.getUser();
  const inviterName =
    inviter.user?.user_metadata?.full_name?.split(' ')[0] ??
    inviter.user?.email?.split('@')[0] ??
    'Alguien';

  const rendered = renderInviteEmail({
    inviteeEmail: parsed.data.email,
    inviterName,
    workspaceName: ctx.workspaceName,
    role: parsed.data.role,
    acceptLink: inviteLink,
  });

  const send = await sendEmail({
    to: parsed.data.email,
    subject: rendered.subject,
    html: rendered.html,
    replyTo: inviter.user?.email ?? undefined,
  });

  return {
    ok: true,
    inviteLink,
    emailSent: send.ok,
    emailError: send.ok ? undefined : send.error,
  };
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
 * Actualiza metadata del workspace activo: name, icon y/o color.
 * Solo admins.
 */
export const updateWorkspaceMeta = async (patch: {
  name?: string;
  icon?: string;
  color?: string;
}): Promise<ActionState> => {
  const parsed = metaSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  let ctx;
  try { ctx = await requireAdmin(); } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('workspaces') as any)
    .update(parsed.data)
    .eq('id', ctx.workspaceId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
};

/**
 * Borra un workspace por completo. Solo el OWNER puede.
 * Se permite borrar el único — en ese caso el user queda sin espacios y la próxima
 * vez que entre al app va a ver la pantalla de Setup para crear uno nuevo.
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

  // Si están borrando el activo, primero limpiamos la cookie así getCurrentWorkspace
  // cae al fallback (otro espacio del que sean miembros) o muestra Setup si no hay.
  if (workspaceId === ctx.workspaceId) {
    const c = await cookies();
    c.delete('workspace_id');
  }

  const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
};

/**
 * Borra la cuenta entera del user. Vía RPC SECURITY DEFINER (delete_my_account)
 * porque borrar de auth.users requiere privilegios elevados. El cascade en DB
 * limpia todos los workspaces donde es owner + members + datos.
 *
 * Después de borrar, cerramos la sesión así el redirect funciona.
 */
export const deleteAccount = async (): Promise<ActionState> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, error: error.message };

  // Limpia cookie del workspace y signOut por las dudas
  try {
    const c = await cookies();
    c.delete('workspace_id');
  } catch { /* no-op */ }
  try { await supabase.auth.signOut(); } catch { /* user ya no existe, ok */ }

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
/**
 * Crea el PRIMER espacio del usuario (cuando aún no tiene ninguno).
 * Se llama desde la pantalla de Setup cuando el auto-recovery falla por
 * cualquier razón (RLS, permisos, etc).
 */
export const bootstrapWorkspace = async (
  name: string = 'Mi espacio',
): Promise<ActionState> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Idempotente: si ya tiene, no hace nada
  const existing = await findCurrentWorkspace();
  if (existing) return { ok: true };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ws, error: wsErr } = await (supabase.from('workspaces') as any)
    .insert({ name: name.trim() || 'Mi espacio', owner_id: user.id })
    .select('id, name, owner_id')
    .single();
  if (wsErr) return { ok: false, error: wsErr.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memErr } = await (supabase.from('workspace_members') as any).insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'admin',
  });
  if (memErr) return { ok: false, error: memErr.message };

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notification_contacts') as any).insert({
    workspace_id: ws.id,
    user_id: user.id,
    name: 'Yo',
    relationship: 'self',
    is_self: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('user_settings') as any).upsert({
    user_id: user.id,
    workspace_id: ws.id,
  });

  await setActiveWorkspace(ws.id);
  revalidatePath('/', 'layout');
  return { ok: true };
};

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
