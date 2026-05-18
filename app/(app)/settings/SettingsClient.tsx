'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, DollarSign, Clock, Bell, Palette, Globe, Check, Loader2 } from 'lucide-react';
import { saveSettings } from './actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/lib/i18n/client';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';

type Settings = Database['public']['Tables']['user_settings']['Row'];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const SettingsClient = ({
  initialSettings,
  userEmail,
}: {
  initialSettings: Settings | null;
  userEmail: string;
}) => {
  const router = useRouter();
  const { t } = useT();
  const [whatsapp, setWhatsapp] = useState(initialSettings?.whatsapp_number ?? '');
  const [currency, setCurrency] = useState(initialSettings?.default_currency ?? 'ARS');
  const [timezone, setTimezone] = useState(
    initialSettings?.timezone ?? 'America/Argentina/Buenos_Aires',
  );
  const [notifyExpenses, setNotifyExpenses] = useState(initialSettings?.notify_expenses ?? true);
  const [notifyReminders, setNotifyReminders] = useState(initialSettings?.notify_reminders ?? true);
  const [status, setStatus] = useState<SaveStatus>('idle');

  // Evita ejecutar el auto-save en el primer render (mount).
  const firstRenderRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    debounceRef.current = setTimeout(async () => {
      setStatus('saving');
      const prevCurrency = initialSettings?.default_currency ?? 'ARS';
      const prevWhatsapp = initialSettings?.whatsapp_number ?? '';
      const fd = new FormData();
      fd.set('whatsapp_number', whatsapp);
      fd.set('default_currency', currency);
      fd.set('timezone', timezone);
      fd.set('notify_expenses', String(notifyExpenses));
      fd.set('notify_reminders', String(notifyReminders));
      try {
        await saveSettings(fd);
        if (currency !== prevCurrency) {
          track('currency_changed', { from: prevCurrency, to: currency });
        }
        if (whatsapp && whatsapp !== prevWhatsapp) {
          track('whatsapp_configured');
        }
        setStatus('saved');
        savedTimerRef.current = setTimeout(() => setStatus('idle'), 1800);
        router.refresh();
      } catch {
        setStatus('error');
        toast.error('No se pudo guardar');
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsapp, currency, timezone, notifyExpenses, notifyReminders]);

  return (
    <div className="space-y-4">
      {/* Indicador sticky de auto-save */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pb-1">
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400 min-h-[1.5rem]">
          {status === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando…</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="w-3.5 h-3.5 text-mint-500" />
              <span className="text-mint-500 font-medium">Guardado</span>
            </>
          )}
          {status === 'error' && (
            <span className="text-rose-500 font-medium">Error al guardar</span>
          )}
        </div>
      </div>
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
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <optgroup label="América del Sur">
            <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
            <option value="America/Argentina/Cordoba">Córdoba (GMT-3)</option>
            <option value="America/Argentina/Mendoza">Mendoza (GMT-3)</option>
            <option value="America/Argentina/Ushuaia">Ushuaia (GMT-3)</option>
            <option value="America/Montevideo">Montevideo (GMT-3)</option>
            <option value="America/Asuncion">Asunción (GMT-3 / GMT-4)</option>
            <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
            <option value="America/La_Paz">La Paz (GMT-4)</option>
            <option value="America/Santiago">Santiago (GMT-4 / GMT-3)</option>
            <option value="America/Caracas">Caracas (GMT-4)</option>
            <option value="America/Bogota">Bogotá (GMT-5)</option>
            <option value="America/Lima">Lima (GMT-5)</option>
            <option value="America/Guayaquil">Quito (GMT-5)</option>
          </optgroup>
          <optgroup label="América del Norte y Central">
            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
            <option value="America/Guatemala">Guatemala (GMT-6)</option>
            <option value="America/San_Salvador">San Salvador (GMT-6)</option>
            <option value="America/Tegucigalpa">Tegucigalpa (GMT-6)</option>
            <option value="America/Managua">Managua (GMT-6)</option>
            <option value="America/Costa_Rica">San José (GMT-6)</option>
            <option value="America/Panama">Panamá (GMT-5)</option>
            <option value="America/Havana">La Habana (GMT-5)</option>
            <option value="America/Santo_Domingo">Santo Domingo (GMT-4)</option>
            <option value="America/Puerto_Rico">San Juan (GMT-4)</option>
            <option value="America/New_York">Nueva York (GMT-5)</option>
            <option value="America/Chicago">Chicago (GMT-6)</option>
            <option value="America/Denver">Denver (GMT-7)</option>
            <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
          </optgroup>
          <optgroup label="Europa">
            <option value="Europe/London">Londres (GMT+0 / GMT+1)</option>
            <option value="Europe/Madrid">Madrid (GMT+1)</option>
            <option value="Europe/Paris">París (GMT+1)</option>
            <option value="Europe/Berlin">Berlín (GMT+1)</option>
            <option value="Europe/Rome">Roma (GMT+1)</option>
            <option value="Europe/Lisbon">Lisboa (GMT+0)</option>
            <option value="Europe/Amsterdam">Ámsterdam (GMT+1)</option>
            <option value="Europe/Brussels">Bruselas (GMT+1)</option>
            <option value="Europe/Zurich">Zúrich (GMT+1)</option>
            <option value="Europe/Athens">Atenas (GMT+2)</option>
          </optgroup>
          <optgroup label="Resto del mundo">
            <option value="UTC">UTC (GMT+0)</option>
            <option value="Asia/Tokyo">Tokio (GMT+9)</option>
            <option value="Asia/Shanghai">Shanghai (GMT+8)</option>
            <option value="Asia/Singapore">Singapur (GMT+8)</option>
            <option value="Asia/Dubai">Dubái (GMT+4)</option>
            <option value="Australia/Sydney">Sídney (GMT+10 / GMT+11)</option>
          </optgroup>
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

      <LanguageSection />

      <div className="kumo-card p-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cuenta: <span className="font-medium text-slate-700 dark:text-slate-200">{userEmail}</span>
        </p>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic pt-2">
        {t.settings.autosave_hint}
      </p>
    </div>
  );
};

const LanguageSection = () => {
  const { t } = useT();
  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 grid place-items-center">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">{t.settings.language}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.settings.language_desc}</p>
        </div>
      </div>
      <LanguageSwitcher />
    </div>
  );
};

const Section = ({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: 'sky' | 'lavender' | 'mint' | 'peach';
  children: React.ReactNode;
}) => {
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
};
