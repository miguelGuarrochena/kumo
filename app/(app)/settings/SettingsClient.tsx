'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, DollarSign, Clock, Bell, Palette } from 'lucide-react';
import { saveSettings } from './actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { Database } from '@/lib/supabase/database.types';

type Settings = Database['public']['Tables']['user_settings']['Row'];

export function SettingsClient({
  initialSettings,
  userEmail,
}: {
  initialSettings: Settings | null;
  userEmail: string;
}) {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState(initialSettings?.whatsapp_number ?? '');
  const [currency, setCurrency] = useState(initialSettings?.default_currency ?? 'ARS');
  const [timezone, setTimezone] = useState(
    initialSettings?.timezone ?? 'America/Argentina/Buenos_Aires',
  );
  const [notifyExpenses, setNotifyExpenses] = useState(initialSettings?.notify_expenses ?? true);
  const [notifyReminders, setNotifyReminders] = useState(initialSettings?.notify_reminders ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.set('whatsapp_number', whatsapp);
    fd.set('default_currency', currency);
    fd.set('timezone', timezone);
    fd.set('notify_expenses', String(notifyExpenses));
    fd.set('notify_reminders', String(notifyReminders));
    try {
      await saveSettings(fd);
      toast.success('Configuración guardada');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-4">
      <Section icon={<MessageCircle className="w-5 h-5" />} title="WhatsApp" tone="mint">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Tu número se mantiene acá por compatibilidad. Para administrar a quién avisar
          (vos, familia, amistades), usá la sección <strong>Contactos</strong> arriba.
        </p>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Tu WhatsApp principal
        </label>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+54911XXXXXXXX"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </Section>

      <Section icon={<DollarSign className="w-5 h-5" />} title="Moneda" tone="sky">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="ARS">Peso argentino (ARS)</option>
          <option value="USD">Dólar estadounidense (USD)</option>
          <option value="EUR">Euro (EUR)</option>
          <option value="MXN">Peso mexicano (MXN)</option>
          <option value="CLP">Peso chileno (CLP)</option>
          <option value="COP">Peso colombiano (COP)</option>
        </select>
      </Section>

      <Section icon={<Clock className="w-5 h-5" />} title="Zona horaria" tone="lavender">
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
          <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
          <option value="America/Bogota">Bogotá (GMT-5)</option>
          <option value="America/Santiago">Santiago (GMT-4)</option>
          <option value="Europe/Madrid">Madrid (GMT+1)</option>
        </select>
      </Section>

      <Section icon={<Bell className="w-5 h-5" />} title="Notificaciones" tone="peach">
        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={notifyExpenses}
            onChange={(e) => setNotifyExpenses(e.target.checked)}
            className="rounded text-sky-600"
          />
          <span className="text-sm">Avisarme de vencimientos próximos</span>
        </label>
        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={notifyReminders}
            onChange={(e) => setNotifyReminders(e.target.checked)}
            className="rounded text-sky-600"
          />
          <span className="text-sm">Avisarme de recordatorios y cumpleaños</span>
        </label>
      </Section>

      <Section icon={<Palette className="w-5 h-5" />} title="Apariencia" tone="lavender">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Tema claro con nubecitas pastel o tema oscuro con cielo estrellado.
        </p>
        <ThemeToggle />
      </Section>

      <div className="kumo-card p-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cuenta: <span className="font-medium text-slate-700 dark:text-slate-200">{userEmail}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg kumo-gradient text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-mint-500 font-medium">Guardado ✓</span>}
      </div>
    </form>
  );
}

function Section({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: 'sky' | 'lavender' | 'mint' | 'peach';
  children: React.ReactNode;
}) {
  const toneStyles = {
    sky: 'bg-sky-100 text-sky-700',
    lavender: 'bg-lavender-100 text-lavender-500',
    mint: 'bg-mint-100 text-mint-500',
    peach: 'bg-peach-100 text-peach-400',
  } as const;
  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg ${toneStyles[tone]} grid place-items-center`}>
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
