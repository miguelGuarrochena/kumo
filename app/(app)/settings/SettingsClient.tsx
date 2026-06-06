'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, DollarSign, Clock, Bell, Palette, Globe, Check, Loader2 } from 'lucide-react';
import { saveSettings } from './actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Select, type SelectGroup, type SelectOption } from '@/components/Select';
import { useT } from '@/lib/i18n/client';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'ARS', label: 'Peso argentino',        hint: 'ARS' },
  { value: 'USD', label: 'Dólar estadounidense',  hint: 'USD' },
  { value: 'EUR', label: 'Euro',                  hint: 'EUR' },
  { value: 'MXN', label: 'Peso mexicano',         hint: 'MXN' },
  { value: 'CLP', label: 'Peso chileno',          hint: 'CLP' },
  { value: 'COP', label: 'Peso colombiano',       hint: 'COP' },
];

const TIMEZONE_GROUPS: SelectGroup[] = [
  {
    label: 'América del Sur',
    options: [
      { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires',   hint: 'GMT-3' },
      { value: 'America/Argentina/Cordoba',      label: 'Córdoba',        hint: 'GMT-3' },
      { value: 'America/Argentina/Mendoza',      label: 'Mendoza',        hint: 'GMT-3' },
      { value: 'America/Argentina/Ushuaia',      label: 'Ushuaia',        hint: 'GMT-3' },
      { value: 'America/Montevideo',             label: 'Montevideo',     hint: 'GMT-3' },
      { value: 'America/Asuncion',               label: 'Asunción',       hint: 'GMT-3/-4' },
      { value: 'America/Sao_Paulo',              label: 'São Paulo',      hint: 'GMT-3' },
      { value: 'America/La_Paz',                 label: 'La Paz',         hint: 'GMT-4' },
      { value: 'America/Santiago',               label: 'Santiago',       hint: 'GMT-4/-3' },
      { value: 'America/Caracas',                label: 'Caracas',        hint: 'GMT-4' },
      { value: 'America/Bogota',                 label: 'Bogotá',         hint: 'GMT-5' },
      { value: 'America/Lima',                   label: 'Lima',           hint: 'GMT-5' },
      { value: 'America/Guayaquil',              label: 'Quito',          hint: 'GMT-5' },
    ],
  },
  {
    label: 'América del Norte y Central',
    options: [
      { value: 'America/Mexico_City',     label: 'Ciudad de México', hint: 'GMT-6' },
      { value: 'America/Guatemala',       label: 'Guatemala',         hint: 'GMT-6' },
      { value: 'America/San_Salvador',    label: 'San Salvador',      hint: 'GMT-6' },
      { value: 'America/Tegucigalpa',     label: 'Tegucigalpa',       hint: 'GMT-6' },
      { value: 'America/Managua',         label: 'Managua',           hint: 'GMT-6' },
      { value: 'America/Costa_Rica',      label: 'San José',          hint: 'GMT-6' },
      { value: 'America/Panama',          label: 'Panamá',            hint: 'GMT-5' },
      { value: 'America/Havana',          label: 'La Habana',         hint: 'GMT-5' },
      { value: 'America/Santo_Domingo',   label: 'Santo Domingo',     hint: 'GMT-4' },
      { value: 'America/Puerto_Rico',     label: 'San Juan',          hint: 'GMT-4' },
      { value: 'America/New_York',        label: 'Nueva York',        hint: 'GMT-5' },
      { value: 'America/Chicago',         label: 'Chicago',           hint: 'GMT-6' },
      { value: 'America/Denver',          label: 'Denver',            hint: 'GMT-7' },
      { value: 'America/Los_Angeles',     label: 'Los Ángeles',       hint: 'GMT-8' },
    ],
  },
  {
    label: 'Europa',
    options: [
      { value: 'Europe/London',    label: 'Londres',   hint: 'GMT+0/+1' },
      { value: 'Europe/Madrid',    label: 'Madrid',    hint: 'GMT+1' },
      { value: 'Europe/Paris',     label: 'París',     hint: 'GMT+1' },
      { value: 'Europe/Berlin',    label: 'Berlín',    hint: 'GMT+1' },
      { value: 'Europe/Rome',      label: 'Roma',      hint: 'GMT+1' },
      { value: 'Europe/Lisbon',    label: 'Lisboa',    hint: 'GMT+0' },
      { value: 'Europe/Amsterdam', label: 'Ámsterdam', hint: 'GMT+1' },
      { value: 'Europe/Brussels',  label: 'Bruselas',  hint: 'GMT+1' },
      { value: 'Europe/Zurich',    label: 'Zúrich',    hint: 'GMT+1' },
      { value: 'Europe/Athens',    label: 'Atenas',    hint: 'GMT+2' },
    ],
  },
  {
    label: 'Resto del mundo',
    options: [
      { value: 'UTC',              label: 'UTC',       hint: 'GMT+0' },
      { value: 'Asia/Tokyo',       label: 'Tokio',     hint: 'GMT+9' },
      { value: 'Asia/Shanghai',    label: 'Shanghai',  hint: 'GMT+8' },
      { value: 'Asia/Singapore',   label: 'Singapur',  hint: 'GMT+8' },
      { value: 'Asia/Dubai',       label: 'Dubái',     hint: 'GMT+4' },
      { value: 'Australia/Sydney', label: 'Sídney',    hint: 'GMT+10/+11' },
    ],
  },
];

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
              <span>{t.common.saving}</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="w-3.5 h-3.5 text-mint-500" />
              <span className="text-mint-500 font-medium">{t.common.saved}</span>
            </>
          )}
          {status === 'error' && (
            <span className="text-rose-500 font-medium">Error</span>
          )}
        </div>
      </div>
      <Section icon={<MessageCircle className="w-5 h-5" />} title={t.settings.section_whatsapp} tone="mint">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          {t.settings.whatsapp_desc}
        </p>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {t.settings.whatsapp_label}
        </label>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+54911XXXXXXXX"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </Section>

      <Section icon={<DollarSign className="w-5 h-5" />} title={t.settings.section_currency} tone="sky">
        <Select
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
          ariaLabel={t.settings.section_currency}
        />
      </Section>

      <Section icon={<Clock className="w-5 h-5" />} title={t.settings.section_timezone} tone="lavender">
        <Select
          value={timezone}
          onChange={setTimezone}
          groups={TIMEZONE_GROUPS}
          searchable
          ariaLabel={t.settings.section_timezone}
        />
      </Section>

      <Section icon={<Bell className="w-5 h-5" />} title={t.settings.section_notifications} tone="peach">
        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={notifyExpenses}
            onChange={(e) => setNotifyExpenses(e.target.checked)}
            className="rounded text-sky-600"
          />
          <span className="text-sm">{t.settings.notify_expenses}</span>
        </label>
        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={notifyReminders}
            onChange={(e) => setNotifyReminders(e.target.checked)}
            className="rounded text-sky-600"
          />
          <span className="text-sm">{t.settings.notify_reminders}</span>
        </label>
      </Section>

      <Section icon={<Palette className="w-5 h-5" />} title={t.settings.section_appearance} tone="lavender">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          {t.settings.appearance_desc}
        </p>
        <ThemeToggle />
      </Section>

      <LanguageSection />

      <div className="kumo-card p-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t.settings.account}: <span className="font-medium text-slate-700 dark:text-slate-200">{userEmail}</span>
        </p>
      </div>

      <DonateSection />

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic pt-2">
        {t.settings.autosave_hint}
      </p>
    </div>
  );
};

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? 'https://cafecito.app/miguelguarrochena';

const DonateSection = () => (
  <a
    href={DONATE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="block kumo-card p-4 hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors group"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center text-lg">
        ☕
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">¿Te sirve Kumo?</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Invitanos un cafecito — nos ayuda a mantener todo gratis.
        </p>
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
        →
      </span>
    </div>
  </a>
);

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
