'use client';

import { useTheme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';

type Props = {
  compact?: boolean;
};

export const ThemeToggle = ({ compact = false }: Props) => {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const options = [
    { value: 'light' as const, label: t.theme.light, icon: Sun },
    { value: 'dark' as const, label: t.theme.dark, icon: Moon },
    { value: 'system' as const, label: t.theme.system, icon: Monitor },
  ];

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" aria-hidden="true" />;

  const handleChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    track('theme_changed', { theme: value });
  };

  if (compact) {
    return (
      <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
        {options.map(({ value, label, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              onClick={() => handleChange(value)}
              className={`w-7 h-7 rounded-full grid place-items-center transition-colors ${
                active
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              aria-label={label}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => handleChange(value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
};
