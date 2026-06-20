'use client';

import { Globe } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/lib/i18n/client';

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? 'https://cafecito.app/miguelguarrochena';

export const Section = ({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: 'sky' | 'lavender' | 'mint' | 'peach';
  children: React.ReactNode;
}) => {
  const toneStyles = {
    sky: 'bg-sky-100 text-sky-700',
    lavender: 'bg-lavender-100 text-lavender-500',
    mint: 'bg-mint-100 text-mint-500',
    peach: 'bg-peach-100 text-peach-400',
  } as const;
  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg ${toneStyles[tone]} grid place-items-center`}>
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
};

export const DonateSection = () => {
  const { t } = useT();
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block kumo-card p-4 hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center text-lg">
          ☕
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t.settings.cafecito_title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.settings.cafecito_desc}
          </p>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          →
        </span>
      </div>
    </a>
  );
};

export const LanguageSection = () => {
  const { t } = useT();
  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 grid place-items-center">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">{t.settings.language}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.settings.language_desc}</p>
        </div>
      </div>
      <LanguageSwitcher />
    </div>
  );
};
