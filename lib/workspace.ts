import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { WorkspaceRole } from '@/lib/supabase/database.types';

const COOKIE_NAME = 'workspace_id';

export type WorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string;
  workspaceColor: string;
  role: WorkspaceRole;
  userId: string;
  ownerId: string;
};

const CATEGORY_DEFAULTS = [
  { name: 'Alquiler',     icon: 'home',         color: 'sky' },
  { name: 'Supermercado', icon: 'shopping-cart', color: 'mint' },
  { name: 'Servicios',    icon: 'zap',          color: 'peach' },
  { name: 'Transporte',   icon: 'car',          color: 'lavender' },
  { name: 'Salud',        icon: 'heart',        color: 'rose' },
  { name: 'Otros',        icon: 'more-horizontal', color: 'slate' },
];

export const findCurrentWorkspace = async (): Promise<WorkspaceContext | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = ((data as any[]) ?? []).filter((m) => m.workspaces != null);
  if (memberships.length === 0) return null;

  const c = await cookies();
  const cookieWs = c.get(COOKIE_NAME)?.value;
  const fromCookie = cookieWs ? memberships.find((m) => m.workspace_id === cookieWs) : undefined;

  if (cookieWs && !fromCookie) {
    try { c.delete(COOKIE_NAME); } catch {}
  }

  const active =
    fromCookie ??
    memberships.find((m) => m.role === 'admin') ??
    memberships[0];

  return {
    workspaceId: active.workspace_id,
    workspaceName: active.workspaces?.name ?? 'Mi espacio',
    workspaceIcon: active.workspaces?.icon ?? 'home',
    workspaceColor: active.workspaces?.color ?? 'sky',
    role: active.role as WorkspaceRole,
    userId: user.id,
    ownerId: active.workspaces?.owner_id ?? user.id,
  };
};

export const getCurrentWorkspace = async (): Promise<WorkspaceContext> => {
  const found = await findCurrentWorkspace();
  if (found) return found;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ws, error: wsErr } = await (supabase.from('workspaces') as any)
    .insert({ name: 'Mi espacio', owner_id: user.id })
    .select('id, name, owner_id')
    .single();
  if (wsErr || !ws) throw new Error(wsErr?.message ?? 'No se pudo crear espacio');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('workspace_members') as any).insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'admin',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('categories') as any).insert(
    CATEGORY_DEFAULTS.map((d) => ({ ...d, user_id: user.id, workspace_id: ws.id })),
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

  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    workspaceIcon: 'home',
    workspaceColor: 'sky',
    role: 'admin',
    userId: user.id,
    ownerId: ws.owner_id,
  };
};

export const tryGetCurrentWorkspace = async (): Promise<WorkspaceContext | null> => {
  try {
    return await getCurrentWorkspace();
  } catch {
    return null;
  }
};

export const requireAdmin = async (): Promise<WorkspaceContext> => {
  const ctx = await getCurrentWorkspace();
  if (ctx.role !== 'admin') {
    throw new Error('Permisos insuficientes — necesitás rol admin');
  }
  return ctx;
};

export const setActiveWorkspace = async (workspaceId: string) => {
  const c = await cookies();
  c.set(COOKIE_NAME, workspaceId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
};
