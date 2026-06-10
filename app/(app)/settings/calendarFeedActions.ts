'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CalendarFeedActionState = {
  ok: boolean;
  error?: string;
  version?: number;
};

export const rotateCalendarFeed = async (): Promise<CalendarFeedActionState> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: row } = await supabase
    .from('user_settings')
    .select('calendar_feed_version')
    .eq('user_id', user.id)
    .maybeSingle();

  const current = (row as { calendar_feed_version?: number } | null)?.calendar_feed_version ?? 0;
  const next = current + 1;

  const { error } = await supabase
    .from('user_settings')
    .update({ calendar_feed_version: next } as never)
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  revalidatePath('/calendar');
  return { ok: true, version: next };
};
