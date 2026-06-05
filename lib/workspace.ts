// Helper para resolver el workspace activo del usuario en server components y actions.
// El workspace activo se guarda en la cookie 'workspace_id'. Si no existe, usamos el
// primero del que el usuario sea miembro (o el que es owner).
//
// Convenciones:
//   - getCurrentWorkspace()  → throws si no hay user o no tiene workspaces.
//   - getRoleInWorkspace()   → 'admin' | 'reader' | null
//   - requireAdmin()         → throws si no es admin (úsar en server actions de write)

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { WorkspaceRole } from '@/lib/supabase/database.types';

const COOKIE_NAME = 'workspace_id';

export type WorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  userId: string;
  ownerId: string;
};

/**
 * Devuelve el workspace activo del usuario actual.
 * Si la cookie tiene un workspace válido del cual es miembro, usa ese.
 * Si no, devuelve el primero del que es miembro (admin tiene prioridad).
 *
 * Si el usuario aún no tiene NINGÚN workspace (caso edge: trigger DB no
 * disparó, migración no corrida, etc.) le crea uno automáticamente.
 */
export const getCurrentWorkspace = async (): Promise<WorkspaceContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Memberships del usuario, joineado con workspaces para sacar name/owner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let memberships: any[] | null = null;
  {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, owner_id)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberships = (data as any[]) ?? null;
  }

  // Si no tiene ninguno, lo creamos al vuelo (auto-recovery)
  if (!memberships || memberships.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ws, error: wsErr } = await (supabase.from('workspaces') as any)
      .insert({ name: 'Mi cuenta', owner_id: user.id })
      .select('id, name, owner_id')
      .single();
    if (wsErr || !ws) throw new Error(wsErr?.message ?? 'No se pudo crear workspace');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('workspace_members') as any).insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'admin',
    });

    // Categorías default para que arranque con algo
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

    // Contacto "Yo" + user_settings vacío
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

    memberships = [{ workspace_id: ws.id, role: 'admin', workspaces: ws }];
  }

  const c = await cookies();
  const cookieWs = c.get(COOKIE_NAME)?.value;
  const ms = memberships;
  const active =
    ms.find((m) => m.workspace_id === cookieWs) ??
    ms.find((m) => m.role === 'admin') ??
    ms[0];

  return {
    workspaceId: active.workspace_id,
    workspaceName: active.workspaces?.name ?? 'Mi cuenta',
    role: active.role as WorkspaceRole,
    userId: user.id,
    ownerId: active.workspaces?.owner_id ?? user.id,
  };
};

/**
 * Versión segura para usar en queries — no tira si no hay user (útil en /api/notify).
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
