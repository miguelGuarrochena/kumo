'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/lib/admin';
import type { PlanProduct } from '@/lib/plans';
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

export const grantPro = async (
  email: string,
  months: number,
  planType: PlanProduct = 'bundle',
): Promise<AdminActionState> => {
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
    plan_type: planType,
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
    plan_type: null,
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

/** Quita OCR, WA o todo el acceso. En combo, baja a un solo complemento. */
export const adjustPlan = async (
  email: string,
  action: 'remove_ocr' | 'remove_wa' | 'remove_all',
): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  if (action === 'remove_all') return cancelImmediate(email);

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('status, plan_type, trial_ends_at, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  type Sub = {
    status: string;
    plan_type: string | null;
    trial_ends_at: string | null;
    current_period_end: string | null;
  };
  const sub = row as Sub | null;
  if (!sub) return { ok: false, error: 'Sin suscripción activa' };

  const now = Date.now();
  const hasAccess =
    sub.status === 'active'
    || (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() > now)
    || (sub.status === 'canceled' && sub.current_period_end && new Date(sub.current_period_end).getTime() > now);

  if (!hasAccess) return { ok: false, error: 'Sin acceso de pago activo' };

  const plan = sub.plan_type as PlanProduct | null;

  if (action === 'remove_ocr') {
    if (plan === 'bundle') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('subscriptions') as any).update({
        plan_type: 'wa',
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
    } else if (plan === 'ocr') {
      return cancelImmediate(email);
    } else {
      return { ok: false, error: 'Este usuario no tiene OCR activo' };
    }
  } else if (action === 'remove_wa') {
    if (plan === 'bundle') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('subscriptions') as any).update({
        plan_type: 'ocr',
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (error) return { ok: false, error: error.message };
    } else if (plan === 'wa') {
      return cancelImmediate(email);
    } else {
      return { ok: false, error: 'Este usuario no tiene WhatsApp automático activo' };
    }
  }

  revalidatePath('/admin');
  return { ok: true };
};

export const extendTrial = async (
  email: string,
  days: number,
  planType: PlanProduct = 'bundle',
): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  const newEnd = new Date(Date.now() + days * 86400_000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any).upsert({
    user_id: user.id,
    status: 'trialing',
    plan_type: planType,
    trial_ends_at: newEnd,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  return { ok: true };
};
