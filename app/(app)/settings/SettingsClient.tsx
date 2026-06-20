'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { MessageCircle, DollarSign, Clock, Bell, Palette, Check, Loader2, Shield } from 'lucide-react';
import { saveSettings } from './actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PushToggle } from '@/components/PushToggle';
import { Select } from '@/components/Select';
import { useT } from '@/lib/i18n/client';
import type { Database } from '@/lib/supabase/database.types';

type SelfContact = Pick<
  Database['public']['Tables']['notification_contacts']['Row'],
  'id' | 'mp_alias' | 'mp_payment_link'
>;
import { track } from '@/lib/analytics';
import { CURRENCY_OPTIONS, TIMEZONE_GROUPS } from './settingsConstants';
import { Section, DonateSection, LanguageSection } from './SettingsSections';
import { ProfileSection } from './ProfileSection';
import { DeleteAccountSection } from './DeleteAccountSection';
import { OnboardingResetSection } from './OnboardingResetSection';

type Settings = Database['public']['Tables']['user_settings']['Row'];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const SettingsClient = ({
  initialSettings,
  userEmail,
  initialDisplayName,
  selfContact,
  vapidPublicKey,
  isAdmin = false,
  isOnboarded = true,
}: {
  initialSettings: Settings | null;
  userEmail: string;
  initialDisplayName: string;
  selfContact: SelfContact | null;
  vapidPublicKey: string;
  isAdmin?: boolean;
  isOnboarded?: boolean;
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

      {isAdmin && (
        <Link
          href={'/admin' as never}
          className="block kumo-card p-4 border-indigo-200/60 dark:border-indigo-500/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 grid place-items-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.settings.admin_panel_title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.settings.admin_panel_desc}
              </p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              →
            </span>
          </div>
        </Link>
      )}

      <ProfileSection
        initialName={initialDisplayName}
        userEmail={userEmail}
        selfContactId={selfContact?.id}
        initialMpAlias={selfContact?.mp_alias}
        initialMpPaymentLink={selfContact?.mp_payment_link}
      />

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
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          <PushToggle vapidPublicKey={vapidPublicKey} />
        </div>
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

      {isOnboarded && <OnboardingResetSection />}

      <DeleteAccountSection userEmail={userEmail} />

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic pt-2">
        {t.settings.autosave_hint}
      </p>
    </div>
  );
};
