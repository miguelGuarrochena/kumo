import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import { ContactsSection } from './ContactsSection';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: contacts }] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', user!.id).single(),
    supabase
      .from('notification_contacts')
      .select('*')
      .order('created_at', { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Contactos, moneda, zona horaria, tema y preferencias de notificación.
        </p>
      </header>

      <ContactsSection contacts={contacts ?? []} />

      <SettingsClient initialSettings={settings} userEmail={user?.email ?? ''} />
    </div>
  );
}
