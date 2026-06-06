'use server';

import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentWorkspace, requireAdmin, setActiveWorkspace } from '@/lib/workspace';
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
  const email = parsed.data.email.toLowerCase();

  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', ctx.workspaceId)
    .limit(1000);
  const { data: emailUsers } = await supabase.rpc('get_workspace_members', { ws_id: ctx.workspaceId });
  const alreadyMember = ((emailUsers as { email: string | null }[] | null) ?? [])
    .some((m) => (m.email ?? '').toLowerCase() === email);
  if (alreadyMember && existingMember) {
    return { ok: false, error: 'Esa persona ya es miembro del espacio.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('workspace_invites') as any).insert({
    workspace_id: ctx.workspaceId,
    email,
    role: parsed.data.role,
    token,
    invited_by: ctx.userId,
  });

  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
      return { ok: false, error: 'Ya hay una invitación pendiente para ese email.' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/settings');

  let origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) origin = `${proto}://${host}`;
  } catch {}
  const inviteLink = `${origin}/accept-invite?token=${token}`;

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

export const deleteWorkspace = async (workspaceId: string): Promise<ActionState> => {
  const ctx = await getCurrentWorkspace();
  const supabase = await createClient();

  const c = await cookies();
  if (workspaceId === ctx.workspaceId) {
    c.delete('workspace_id');
  }

  const { error } = await supabase.rpc('delete_workspace_safe', { ws_id: workspaceId });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
};

export const deleteAccount = async (): Promise<ActionState> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, error: error.message };

  try {
    const c = await cookies();
    c.delete('workspace_id');
  } catch {}
  try { await supabase.auth.signOut(); } catch {}

  return { ok: true };
};

export const switchWorkspace = async (workspaceId: string): Promise<ActionState> => {
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

export const bootstrapWorkspace = async (
  name: string = 'Mi espacio',
): Promise<ActionState> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('bootstrap_workspace_safe', { ws_name: name });
  if (error) return { ok: false, error: error.message };

  const wsId = data as string | null;
  if (wsId) await setActiveWorkspace(wsId);
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

  await setActiveWorkspace(ws.id);
  revalidatePath('/', 'layout');
  return { ok: true, workspaceId: ws.id };
};
