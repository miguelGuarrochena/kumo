'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/workspace';
import { scheduleReminderDelete, scheduleReminderSync } from '@/lib/calendar/scheduleSync';

const REMINDER_TYPES = ['medical', 'birthday', 'generic'] as const;

const reminderSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Título requerido').max(100),
  description: z.string().max(500).optional().nullable(),
  reminder_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  reminder_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Hora inválida')
    .optional()
    .nullable(),
  reminder_type: z.enum(REMINDER_TYPES).default('generic'),
  is_recurring: z.coerce.boolean().default(false),
  notify_days_before: z.coerce.number().int().min(0).max(60).default(1),
  notify_contact_ids: z.array(z.string().uuid()).default([]),
});

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('reminders') as any).update(payload).eq('id', parsed.data.id);
    if (error) return { ok: false, error: (error as { message?: string }).message ?? 'Error' };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase.from('reminders') as any)
      .insert(payload)
      .select('id')
      .single();
    if (error) return { ok: false, error: (error as { message?: string }).message ?? 'Error' };
    reminderId = (created as { id: string }).id;
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
