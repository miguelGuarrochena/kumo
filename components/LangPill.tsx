'use client';

// Switcher de idioma compacto para headers y barras superiores donde no entra
// el LangSwitcher con dropdown. Dos píldoras "ES | EN" pegadas, una activa.

import { setLocale, useT } from '@/lib/i18n/client';
import { LOCALES, type Locale } from '@/lib/i18n/types';

export const LangPill = () => {
  const { locale } = useT();

  const onPick = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex rounded-lg bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur p-0.5 border border-slate-200/60 dark:border-slate-700/60"
    >
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onPick(l)}
            aria-pressed={active}
            className={`px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-md transition-colors ${
              active
                ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
};
