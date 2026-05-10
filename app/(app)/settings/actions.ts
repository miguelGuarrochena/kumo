'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const payload = {
    user_id: user.id,
    whatsapp_number: (formData.get('whatsapp_number') as string) || null,
    default_currency: (formData.get('default_currency') as string) ?? 'ARS',
    timezone: (formData.get('timezone') as string) ?? 'America/Argentina/Buenos_Aires',
    notify_expenses: formData.get('notify_expenses') === 'true',
    notify_reminders: formData.get('notify_reminders') === 'true',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_settings').upsert(payload);
  if (error) throw error;

  revalidatePath('/settings');
}
