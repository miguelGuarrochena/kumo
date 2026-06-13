'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'kumo_install_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && safari;
};

const wasDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
};

export const InstallPrompt = () => {
  const { t } = useT();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // ya instalada
    if (wasDismissedRecently()) return; // descartó hace poco

    // Caso Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Caso iOS Safari: no hay event; mostramos manual después de un delay corto
    if (isIOSSafari()) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2000); // damos 2s para que el user se familiarice
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
    setShowIOSHelp(false);
    track('pwa_install_dismissed');
  };

  const onInstall = async () => {
    if (deferredPrompt) {
      track('pwa_install_clicked');
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      track('pwa_install_result', { outcome: choice.outcome });
      setDeferredPrompt(null);
      setVisible(false);
      if (choice.outcome === 'dismissed') {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
      }
    } else if (isIOSSafari()) {
      // No podemos triggear instalación; mostramos instrucciones
      setShowIOSHelp(true);
      track('pwa_install_ios_help_shown');
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Banner principal — bottom-center mobile, bottom-right desktop */}
      <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-40">
        <div className="kumo-card p-3 shadow-xl border border-sky-200/60 dark:border-sky-500/30 bg-white dark:bg-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg kumo-gradient text-white grid place-items-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.install.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.install.description}
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={onInstall}
                  className="px-3 py-1.5 rounded-lg kumo-gradient text-white text-xs font-medium hover:opacity-90"
                >
                  {t.install.install}
                </button>
                <button
                  onClick={dismiss}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {t.install.later}
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sheet iOS con instrucciones */}
      {showIOSHelp && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={dismiss}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white dark:bg-slate-800 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom"
          >
            <div className="sm:hidden flex justify-center">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t.install.ios_title}</h3>
              <button
                onClick={dismiss}
                className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label={t.common.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>
                  {t.install.ios_step1_before} <strong>{t.install.ios_share}</strong>{' '}
                  <Share className="w-3.5 h-3.5 inline-block align-middle mx-0.5 text-sky-500" />
                  {t.install.ios_step1_after}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>
                  {t.install.ios_step2_before} <strong>{t.install.ios_add_home}</strong>{' '}
                  <Plus className="w-3.5 h-3.5 inline-block align-middle mx-0.5 text-sky-500" />
                  {t.install.ios_step2_after}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>
                  {t.install.ios_step3_before} <strong>{t.install.ios_add}</strong>
                  {t.install.ios_step3_after}
                </span>
              </li>
            </ol>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center pt-1">
              {t.install.ios_offline_hint}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
