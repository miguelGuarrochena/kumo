'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/lib/admin';
import type { PlanProduct } from '@/lib/plans';
import { findUserByEmail } from '@/lib/admin/users';
import { createServiceClient } from '@/lib/supabase/service';

export type AdminActionState = { ok: boolean; error?: string };

const revalidateBilling = () => {
  revalidatePath('/admin');
  revalidatePath('/settings');
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

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: user.id,
    status: 'active',
    plan_type: planType,
    trial_ends_at: null,
    current_period_end: end.toISOString(),
    updated_at: now.toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidateBilling();
  return { ok: true };
};

export const cancelImmediate = async (email: string): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'free',
      plan_type: null,
      trial_ends_at: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select('user_id');

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: 'No se encontró suscripción para este usuario' };

  revalidateBilling();
  return { ok: true };
};

export const cancelAtPeriodEnd = async (email: string): Promise<AdminActionState> => {
  if (!(await requireAdminUser())) return { ok: false, error: 'No autorizado' };
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  const status = (row as { status: string } | null)?.status;
  // Trial no tiene "fin de período" en MP — revocar ya.
  if (status === 'trialing') return cancelImmediate(email);

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select('user_id');

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: 'No se encontró suscripción para este usuario' };

  revalidateBilling();
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

  // Trial = un solo beneficio regalado; quitar una pieza revoca todo el trial.
  if (sub.status === 'trialing') return cancelImmediate(email);

  if (action === 'remove_ocr') {
    if (plan === 'bundle') {
      const { error } = await supabase.from('subscriptions').update({
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
      const { error } = await supabase.from('subscriptions').update({
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

  revalidateBilling();
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
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: user.id,
    status: 'trialing',
    plan_type: planType,
    trial_ends_at: newEnd,
    current_period_end: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidateBilling();
  return { ok: true };
};
