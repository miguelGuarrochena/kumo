'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';

export type AdminActionState = { ok: boolean; error?: string };

const findUserByEmail = async (email: string): Promise<{ id: string } | null> => {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const match = (data.users as { id: string; email: string | null }[])
    .find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  return match ? { id: match.id } : null;
};

export const grantPro = async (email: string, months: number): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  const now = new Date();
  const end = months >= 1200
    ? new Date('2099-12-31T00:00:00Z')
    : new Date(now.getTime() + months * 30 * 86400_000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any).upsert({
    user_id: user.id,
    status: 'active',
    current_period_end: end.toISOString(),
    updated_at: now.toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  return { ok: true };
};

export const cancelImmediate = async (email: string): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any).update({
    status: 'canceled',
    current_period_end: new Date(Date.now() - 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  return { ok: true };
};

export const cancelAtPeriodEnd = async (email: string): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any).update({
    status: 'canceled',
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  return { ok: true };
};

export const extendTrial = async (email: string, days: number): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  const newEnd = new Date(Date.now() + days * 86400_000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any).upsert({
    user_id: user.id,
    status: 'trialing',
    trial_ends_at: newEnd,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  return { ok: true };
};
