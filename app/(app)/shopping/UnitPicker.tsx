'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { UNITS } from './constants';
import { useT } from '@/lib/i18n/client';

type UnitPickerProps = {
  value: string;
  onChange: (v: string) => void;
  align?: 'left' | 'right';
};

export const UnitPicker = ({ value, onChange, align = 'left' }: UnitPickerProps) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const current = UNITS.find((u) => u.value === value) ?? UNITS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[5rem] justify-between ${
          open
            ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            className={`absolute z-50 top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[10rem] overflow-hidden`}
          >
            {UNITS.map((u) => {
              const active = u.value === value;
              return (
                <button
                  key={u.value || 'default'}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(u.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-8 text-center font-medium">{u.label}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs">
                      {t.shopping[u.i18nKey]}
                    </span>
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
