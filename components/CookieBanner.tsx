'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

const KEY = 'kumo-cookie-consent';

export const CookieBanner = () => {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) {
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const accept = (analytics: boolean) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ analytics, ts: Date.now() }));
      if (!analytics) {
        // Opt-out de PostHog si rechazó. La librería respeta esto.
        const ph = (window as Window & { posthog?: { opt_out_capturing?: () => void } }).posthog;
        if (ph?.opt_out_capturing) ph.opt_out_capturing();
      }
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="kumo-card p-4 shadow-2xl border-slate-200/80 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t.cookies.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {t.cookies.description_before}{' '}
              <Link href="/legal/privacy" className="underline hover:text-sky-500">
                {t.cookies.privacy_link}
              </Link>
              .
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => accept(true)}
                className="px-3 py-1.5 rounded-lg kumo-gradient text-white text-xs font-medium hover:opacity-90"
              >
                {t.cookies.accept_all}
              </button>
              <button
                type="button"
                onClick={() => accept(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.cookies.essential_only}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => accept(true)}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
