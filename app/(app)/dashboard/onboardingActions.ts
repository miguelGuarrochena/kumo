'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function skipOnboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('user_settings') as any)
    .update({ onboarded: true })
    .eq('user_id', user.id);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function reopenOnboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('user_settings') as any)
    .update({ onboarded: false })
    .eq('user_id', user.id);
  revalidatePath('/dashboard');
  revalidatePath('/settings');
  return { ok: true };
}
