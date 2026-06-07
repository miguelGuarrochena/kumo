'use client';

import type { ContactLite } from './types';
import { DividirTab } from './DividirTab';
import { useT } from '@/lib/i18n/client';

type Props = {
  contacts: ContactLite[];
  isPro: boolean;
};

export const DividirClient = ({ contacts, isPro }: Props) => {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.split.page_title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.split.page_subtitle}
        </p>
      </header>

      <DividirTab contacts={contacts} isPro={isPro} />
    </div>
  );
};
