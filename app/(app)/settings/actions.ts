'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspace } from '@/lib/workspace';

// user_settings es per-user (preferencias propias), pero igual guardamos
// workspace_id por consistencia con el resto del schema.
export async function saveSettings(formData: FormData) {
  const ctx = await getCurrentWorkspace();

  const supabase = await createClient();
  const payload = {
    user_id: ctx.userId,
    workspace_id: ctx.workspaceId,
    whatsapp_number: (formData.get('whatsapp_number') as string) || null,
    default_currency: (formData.get('default_currency') as string) ?? 'ARS',
    timezone: (formData.get('timezone') as string) ?? 'America/Argentina/Buenos_Aires',
    notify_expenses: formData.get('notify_expenses') === 'true',
    notify_reminders: formData.get('notify_reminders') === 'true',
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('user_settings') as any).upsert(payload);
  if (error) throw error;

  revalidatePath('/settings');
}
