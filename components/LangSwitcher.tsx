'use client';

import { useState } from 'react';
import { Check, Globe, ChevronUp } from 'lucide-react';
import { useT, setLocale } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/types';

const LANGS: { value: Locale; label: string; flag: string }[] = [
  { value: 'es', label: 'Español', flag: 'ES' },
  { value: 'en', label: 'English', flag: 'EN' },
];

export const LangSwitcher = () => {
  const { locale } = useT();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.value === locale) ?? LANGS[0]!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            className="absolute bottom-full mb-1 left-0 right-0 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 overflow-hidden"
          >
            {LANGS.map((l) => {
              const active = l.value === locale;
              return (
                <button
                  key={l.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setOpen(false);
                    if (l.value !== locale) setLocale(l.value);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {l.flag}
                    </span>
                    {l.label}
                  </span>
                  {active && <Check className="w-4 h-4 text-sky-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
