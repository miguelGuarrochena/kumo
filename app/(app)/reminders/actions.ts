'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/workspace';
import { scheduleReminderDelete } from '@/lib/calendar/scheduleSync';
import {
  deleteReminderFromGoogle,
  syncReminderToGoogle,
} from '@/lib/calendar/googleSync';
import { isGoogleCalendarOAuthConfigured } from '@/lib/calendar/googleConfigured';
import { reminderSchema } from '@/lib/schemas';

// `syncWarning` se setea cuando el guardado fue exitoso PERO la sync con
// Google Calendar falló. El cliente lo usa para mostrar un toast.warning
// además del toast.success. Antes esto quedaba mudo en `after()` y el user
// no sabía por qué los eventos no aparecían en Google.
export type ReminderFormState = { ok: boolean; error?: string; syncWarning?: string };

export async function upsertReminder(
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const raw = {
    id: (formData.get('id') as string) || undefined,
    title: formData.get('title'),
    description: (formData.get('description') as string) || null,
    reminder_date: formData.get('reminder_date'),
    reminder_time: (formData.get('reminder_time') as string) || null,
    reminder_type: (formData.get('reminder_type') as string) || 'generic',
    is_recurring: formData.get('is_recurring') === 'true',
    notify_days_before: formData.get('notify_days_before') || 1,
    notify_contact_ids: formData.getAll('notify_contact_ids') as string[],
  };

  const parsed = reminderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  const payload = { ...parsed.data, user_id: ctx.userId, workspace_id: ctx.workspaceId };

  let reminderId = parsed.data.id ?? null;

  if (parsed.data.id) {
    const { error } = await supabase.from('reminders').update(payload).eq('id', parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: created, error } = await supabase
      .from('reminders')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    reminderId = created.id;
  }

  // Sync inline con Google Calendar para que el user vea errores en el toast
  // si falla. El reminder ya está guardado en DB; si la sync falla, el CRUD
  // sigue siendo exitoso pero el cliente recibe `syncWarning` con el motivo.
  let syncWarning: string | undefined;
  if (reminderId && isGoogleCalendarOAuthConfigured()) {
    try {
      await syncReminderToGoogle(ctx.userId, reminderId);
    } catch (e) {
      syncWarning = `Reminder saved, but Google Calendar sync failed: ${(e as Error).message}`;
    }
  }

  revalidatePath('/reminders');
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true, syncWarning };
}

export async function deleteReminder(id: string): Promise<ReminderFormState> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  // Mantenemos scheduleReminderDelete por compat, pero también intentamos
  // borrar inline para reportar errores al cliente.
  let syncWarning: string | undefined;
  if (isGoogleCalendarOAuthConfigured()) {
    try {
      await deleteReminderFromGoogle(ctx.userId, id);
    } catch (e) {
      syncWarning = `Reminder deleted, but Google Calendar sync failed: ${(e as Error).message}`;
      // Fallback al schedule por si fue un timeout transitorio
      scheduleReminderDelete(ctx.userId, id);
    }
  }

  revalidatePath('/reminders');
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true, syncWarning };
}
