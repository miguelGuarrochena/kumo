'use client';

import { useState } from 'react';
import { setLocale, useT } from '@/lib/i18n/client';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/types';
import { Globe, Check } from 'lucide-react';

// Switcher de idioma — usar en Settings.

export function LanguageSwitcher() {
  const { locale } = useT();
  const [pending, setPending] = useState<Locale | null>(null);

  const onChange = async (next: Locale) => {
    if (next === locale) return;
    setPending(next);
    await setLocale(next);
    // window.location.reload() se ejecuta dentro de setLocale
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {LOCALES.map((l) => {
        const active = locale === l;
        const isPending = pending === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            disabled={!!pending}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
              active
                ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            } disabled:opacity-50`}
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">{LOCALE_LABELS[l]}</span>
            {active && !isPending && <Check className="w-3.5 h-3.5" />}
            {isPending && <span className="text-xs">...</span>}
          </button>
        );
      })}
    </div>
  );
}
