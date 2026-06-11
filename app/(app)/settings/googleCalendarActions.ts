'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { disconnectGoogleCalendar, fullSyncToGoogle } from '@/lib/calendar/googleSync';
import { isGoogleCalendarOAuthConfigured } from '@/lib/calendar/googleConfigured';

export type GoogleCalendarActionState = { ok: boolean; error?: string; synced?: number };

export const disconnectGoogleCalendarAction = async (): Promise<GoogleCalendarActionState> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  try {
    await disconnectGoogleCalendar(user.id);
    revalidatePath('/settings');
    revalidatePath('/calendar');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};

export const resyncGoogleCalendarAction = async (): Promise<GoogleCalendarActionState> => {
  if (!isGoogleCalendarOAuthConfigured()) {
    return { ok: false, error: 'Google Calendar no está configurado en el servidor' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  try {
    const { synced } = await fullSyncToGoogle(user.id);
    revalidatePath('/settings');
    return { ok: true, synced };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};
