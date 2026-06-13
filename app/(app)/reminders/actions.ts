'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/workspace';
import { scheduleReminderDelete, scheduleReminderSync } from '@/lib/calendar/scheduleSync';
import { reminderSchema } from '@/lib/schemas';

export type ReminderFormState = { ok: boolean; error?: string };

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

  if (reminderId) scheduleReminderSync(ctx.userId, reminderId);

  revalidatePath('/reminders');
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true };
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
  scheduleReminderDelete(ctx.userId, id);
  revalidatePath('/reminders');
  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true };
}
