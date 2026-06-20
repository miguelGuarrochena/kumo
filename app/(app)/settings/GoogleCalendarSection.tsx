'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Check, ExternalLink, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/client';
import { Section } from './SettingsSections';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { track } from '@/lib/analytics';
import {
  disconnectGoogleCalendarAction,
  resyncGoogleCalendarAction,
} from './googleCalendarActions';

type Props = {
  connected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
  syncError: string | null;
  oauthConfigured: boolean;
  // Cuando false, escondemos el botón Connect (feature en revisión por Google).
  // Los users ya conectados igual ven el estado y pueden desconectar.
  featurePublic: boolean;
};

const formatWhen = (iso: string | null, locale: string): string | null => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const GoogleCalendarSection = ({
  connected,
  connectedAt,
  lastSyncAt,
  syncError,
  oauthConfigured,
  featurePublic,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useT();
  const s = t.settings;
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#google-calendar') {
      document.getElementById('google-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const status = searchParams.get('google_calendar');
    if (!status) return;
    if (status === 'connected') {
      toast.success(s.google_calendar_connected_toast);
      track('google_calendar_connected');
    } else if (status === 'error') {
      const err = searchParams.get('google_calendar_error');
      toast.error(
        err === 'not_configured'
          ? s.google_calendar_not_configured
          : s.google_calendar_connect_error.replace('{error}', err ?? t.common.error),
      );
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('google_calendar');
    url.searchParams.delete('google_calendar_error');
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [searchParams, router, s, t.common.error]);

  const onConnect = () => {
    window.location.href = '/api/auth/google-calendar';
  };

  const onDisconnect = async () => {
    setConfirmDisconnect(false);
    setPending(true);
    try {
      const result = await disconnectGoogleCalendarAction();
      if (result.ok) {
        toast.success(s.google_calendar_disconnected_toast);
        track('google_calendar_disconnected');
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    } finally {
      setPending(false);
    }
  };

  const onResync = async () => {
    setPending(true);
    try {
      const result = await resyncGoogleCalendarAction();
      if (result.ok) {
        toast.success(
          s.google_calendar_resync_toast.replace('{n}', String(result.synced ?? 0)),
        );
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div id="google-calendar">
      <Section icon={<Calendar className="w-5 h-5" />} title={s.google_calendar_title} tone="sky">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{s.google_calendar_desc}</p>

        {!oauthConfigured && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-xl px-3 py-2 mb-4">
            {s.google_calendar_not_configured}
          </p>
        )}

        {connected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-mint-200/60 dark:border-mint-500/30 bg-mint-50/50 dark:bg-mint-500/5 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-mint-100 dark:bg-mint-500/20 text-mint-600 dark:text-mint-300 grid place-items-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100">
                  {s.google_calendar_connected_label}
                </p>
                {connectedAt && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.google_calendar_connected_since.replace(
                      '{date}',
                      formatWhen(connectedAt, locale) ?? connectedAt,
                    )}
                  </p>
                )}
                {lastSyncAt && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.google_calendar_last_sync.replace(
                      '{date}',
                      formatWhen(lastSyncAt, locale) ?? lastSyncAt,
                    )}
                  </p>
                )}
                {syncError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                    {s.google_calendar_sync_error.replace('{error}', syncError)}
                  </p>
                )}
              </div>
            </div>

            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4">
              <li>{s.google_calendar_bullet_reminders}</li>
              <li>{s.google_calendar_bullet_expenses}</li>
              <li>{s.google_calendar_bullet_oneway}</li>
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResync}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {s.google_calendar_resync_cta}
              </button>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ExternalLink className="w-4 h-4" />
                {s.google_calendar_open}
              </a>
              <button
                type="button"
                onClick={() => setConfirmDisconnect(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
              >
                <Unplug className="w-4 h-4" />
                {s.google_calendar_disconnect_cta}
              </button>
            </div>
          </div>
        ) : featurePublic ? (
          <div className="space-y-4">
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>{s.google_calendar_step1}</li>
              <li>{s.google_calendar_step2}</li>
              <li>{s.google_calendar_step3}</li>
            </ul>
            <button
              type="button"
              onClick={onConnect}
              disabled={!oauthConfigured}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Calendar className="w-4 h-4" />
              {s.google_calendar_connect_cta}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.google_calendar_note}</p>
          </div>
        ) : (
          // Feature en revisión por Google — escondemos el botón Connect.
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100">
                  {s.google_calendar_coming_soon_title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {s.google_calendar_coming_soon_desc}
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={onDisconnect}
        closeOnConfirm={false}
        title={s.google_calendar_disconnect_title}
        description={s.google_calendar_disconnect_desc}
        confirmLabel={s.google_calendar_disconnect_cta}
      />
    </div>
  );
};
