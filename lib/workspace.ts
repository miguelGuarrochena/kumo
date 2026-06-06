// Helper para resolver el workspace activo del usuario en server components y actions.
// El workspace activo se guarda en la cookie 'workspace_id'. Si no existe, usamos el
// primero del que el usuario sea miembro (o el que es owner).
//
// Convenciones:
//   - findCurrentWorkspace()    → null si no tiene workspace (no crea nada)
//   - getCurrentWorkspace()     → throws si no se pudo resolver/crear
//   - tryGetCurrentWorkspace()  → null en cualquier error (silencia)
//   - requireAdmin()            → throws si no es admin

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

/**
 * Resuelve el workspace activo SIN intentar crear nada.
 * Devuelve null si el usuario no tiene ninguno todavía.
 *
 * Esto sirve para que el layout pueda detectar el caso "user nuevo sin espacio"
 * y mostrar una pantalla de setup en vez de fallar/redirigir.
 */
export const findCurrentWorkspace = async (): Promise<WorkspaceContext | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Usamos workspaces(*) para tolerar migraciones aún no corridas:
  // si la columna icon/color no existe todavía, simplemente vienen como
  // undefined y los reemplazamos con defaults abajo.
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = (data as any[]) ?? [];
  if (memberships.length === 0) return null;

  const c = await cookies();
  const cookieWs = c.get(COOKIE_NAME)?.value;
  const active =
    memberships.find((m) => m.workspace_id === cookieWs) ??
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

/**
 * Como findCurrentWorkspace pero TIRA si no hay user o si no se pudo resolver.
 * Si el usuario no tiene workspace, intenta crearlo on-the-fly.
 */
export const getCurrentWorkspace = async (): Promise<WorkspaceContext> => {
  const found = await findCurrentWorkspace();
  if (found) return found;

  // Auto-recovery: crear workspace si no tiene ninguno
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

/**
 * Versión segura para usar en queries — no tira nunca.
 */
export const tryGetCurrentWorkspace = async (): Promise<WorkspaceContext | null> => {
  try {
    return await getCurrentWorkspace();
  } catch {
    return null;
  }
};

/**
 * Lanza error si el usuario no es admin del workspace activo.
 * Úsalo al principio de cada server action que escribe.
 */
export const requireAdmin = async (): Promise<WorkspaceContext> => {
  const ctx = await getCurrentWorkspace();
  if (ctx.role !== 'admin') {
    throw new Error('Permisos insuficientes — necesitás rol admin');
  }
  return ctx;
};

/**
 * Setea la cookie del workspace activo (para el switcher).
 */
export const setActiveWorkspace = async (workspaceId: string) => {
  const c = await cookies();
  c.set(COOKIE_NAME, workspaceId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
  });
};
