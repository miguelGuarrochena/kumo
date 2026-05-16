import { createClient } from '@/lib/supabase/server';
import { RemindersClient } from './RemindersClient';

export default async function RemindersPage() {
  const supabase = await createClient();

  const [{ data: reminders }, { data: contacts }] = await Promise.all([
    supabase.from('reminders').select('*').order('reminder_date', { ascending: true }),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone')
      .order('created_at'),
  ]);

  return (
    <RemindersClient
      initialReminders={reminders ?? []}
      contacts={contacts ?? []}
    />
  );
}
