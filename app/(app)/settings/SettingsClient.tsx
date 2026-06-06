'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, DollarSign, Clock, Bell, Palette, Globe, Check, Loader2, User, AlertTriangle, Trash2 } from 'lucide-react';
import { saveSettings } from './actions';
import { deleteAccount } from './workspaceActions';
import { Sheet } from '@/components/Sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Select, type SelectGroup, type SelectOption } from '@/components/Select';
import { useT } from '@/lib/i18n/client';
import { createClient } from '@/lib/supabase/client';
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
  initialDisplayName,
}: {
  initialSettings: Settings | null;
  userEmail: string;
  initialDisplayName: string;
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

      <ProfileSection initialName={initialDisplayName} userEmail={userEmail} />

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

      <DeleteAccountSection userEmail={userEmail} />

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic pt-2">
        {t.settings.autosave_hint}
      </p>
    </div>
  );
};

const DeleteAccountSection = ({ userEmail }: { userEmail: string }) => {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pending, startTransition] = useTransition();
  const CONFIRM_WORD = 'ELIMINAR';

  const onConfirm = () => {
    if (confirmText !== CONFIRM_WORD) return;
    startTransition(async () => {
      const result = await deleteAccount();
      if (result.ok) {
        toast.success('Cuenta eliminada');
        window.location.href = '/';
      } else {
        toast.error(result.error ?? 'No se pudo eliminar');
      }
    });
  };

  return (
    <>
      <div className="kumo-card p-5 border-rose-100 dark:border-rose-900/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 grid place-items-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Eliminar cuenta</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Borra tu usuario y todos los espacios donde sos dueño. No hay vuelta atrás.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setConfirmText(''); setOpen(true); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar mi cuenta
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => { setOpen(false); setConfirmText(''); }}
        title="Eliminar cuenta"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirmText(''); }}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmText !== CONFIRM_WORD || pending}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending ? 'Borrando...' : 'Eliminar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-700 dark:text-rose-200 space-y-1.5">
              <p className="font-medium">Vas a perder permanentemente:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-600/90 dark:text-rose-200/90">
                <li>Todos los espacios donde sos dueño (con sus gastos, recordatorios y listas)</li>
                <li>Tu acceso a espacios compartidos</li>
                <li>Tu cuenta <span className="font-mono text-xs">{userEmail}</span></li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Escribí <span className="font-mono font-semibold">{CONFIRM_WORD}</span> para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 text-base font-mono"
              autoFocus
            />
          </div>
        </div>
      </Sheet>
    </>
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

const ProfileSection = ({
  initialName,
  userEmail,
}: {
  initialName: string;
  userEmail: string;
}) => {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const firstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    const trimmed = name.trim();
    if (trimmed === initialName) {
      setStatus('idle');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setStatus('saving');
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed || null },
      });
      if (error) {
        setStatus('error');
        toast.error('No se pudo guardar');
        return;
      }
      setStatus('saved');
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 1800);
      router.refresh();
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const initial = (name.trim() || userEmail).charAt(0).toUpperCase();

  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 grid place-items-center">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">Tu perfil</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Así te van a ver en el dashboard y los miembros de tu espacio.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full kumo-gradient text-white grid place-items-center text-lg font-medium shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="profile-name" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Nombre que ven los demás
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          />
        </div>
        <div className="w-16 text-right shrink-0">
          {status === 'saving' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              ...
            </span>
          )}
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-mint-500 font-medium">
              <Check className="w-3 h-3" />
              ✓
            </span>
          )}
        </div>
      </div>
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
