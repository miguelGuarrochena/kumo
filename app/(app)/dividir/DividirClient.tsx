'use client';

import { useState } from 'react';
import { Calculator, Scale } from 'lucide-react';
import type { BalanceRow, ContactLite, PaymentRow } from './types';
import { DividirTab } from './DividirTab';
import { SaldosTab } from './SaldosTab';
import { useT } from '@/lib/i18n/client';

type Props = {
  contacts: ContactLite[];
  balances: BalanceRow[];
  payments: PaymentRow[];
  hasOcrAccess: boolean;
  trialDaysLeft: number | null;
  priceMonthly: string;
  priceYearly: string;
  yearlyPct: number;
};

type Tab = 'dividir' | 'saldos';

export const DividirClient = ({
  contacts, balances, payments,
  hasOcrAccess, trialDaysLeft, priceMonthly, priceYearly, yearlyPct,
}: Props) => {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('dividir');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.split.page_title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.split.page_subtitle}
        </p>
      </header>

      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setTab('dividir')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'dividir'
              ? 'bg-white dark:bg-slate-700 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          {t.split.tab_split}
        </button>
        <button
          type="button"
          onClick={() => setTab('saldos')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'saldos'
              ? 'bg-white dark:bg-slate-700 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          {t.split.tab_balances}
        </button>
      </div>

      {tab === 'dividir' ? (
        <DividirTab
          contacts={contacts}
          hasOcrAccess={hasOcrAccess}
          trialDaysLeft={trialDaysLeft}
          priceMonthly={priceMonthly}
          priceYearly={priceYearly}
          yearlyPct={yearlyPct}
        />
      ) : (
        <SaldosTab balances={balances} contacts={contacts} payments={payments} />
      )}
    </div>
  );
};
