'use client';

import { useEffect, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

const GOOGLE_CALENDAR_DONE_KEY = 'kumo_google_calendar_done';
const CALENDAR_BANNER_DISMISS_KEY = 'kumo_calendar_banner_dismissed';

const markGoogleCalendarDone = () => {
  try {
    localStorage.setItem(GOOGLE_CALENDAR_DONE_KEY, '1');
  } catch {
    /* ignore */
  }
};

const isGoogleCalendarDone = () => {
  try {
    return localStorage.getItem(GOOGLE_CALENDAR_DONE_KEY) === '1';
  } catch {
    return false;
  }
};

const dismissCalendarBanner = () => {
  try {
    localStorage.setItem(CALENDAR_BANNER_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
};

const isCalendarBannerDismissed = () => {
  try {
    return localStorage.getItem(CALENDAR_BANNER_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

type Props = {
  connected: boolean;
};

export const GoogleCalendarBanner = ({ connected }: Props) => {
  const { t } = useT();
  const s = t.settings;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!connected && !isGoogleCalendarDone() && !isCalendarBannerDismissed());
  }, [connected]);

  if (!visible) return null;

  return (
    <div className="kumo-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-sky-200/60 dark:border-sky-500/30 bg-sky-50/40 dark:bg-sky-500/5">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 grid place-items-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {s.google_calendar_banner_title}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {s.google_calendar_banner_desc}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/settings#google-calendar"
          onClick={() => markGoogleCalendarDone()}
          className="px-3 py-2 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90"
        >
          {s.google_calendar_connect_cta}
        </a>
        <button
          type="button"
          onClick={() => {
            dismissCalendarBanner();
            setVisible(false);
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={s.google_calendar_banner_dismiss}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
