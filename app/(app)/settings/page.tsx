import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-slate-500 mt-1">
          WhatsApp, moneda, zona horaria y preferencias de notificación.
        </p>
      </header>

      <SettingsClient initialSettings={settings} userEmail={user?.email ?? ''} />
    </div>
  );
}
