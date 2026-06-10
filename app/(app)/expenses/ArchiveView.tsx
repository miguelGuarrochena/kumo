'use client';

import { Archive } from 'lucide-react';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import type { ArchiveYear } from './page';
import { CurrencyInlineSelect } from './CurrencyInlineSelect';

type ArchiveViewProps = {
  years: ArchiveYear[];
  displayCurrency: Currency;
  onSelectYear: (year: number) => void;
  onChangeCurrency: (v: string) => void;
};

// Vista Histórico: cards por año
export const ArchiveView = ({
  years,
  displayCurrency,
  onSelectYear,
  onChangeCurrency,
}: ArchiveViewProps) => {
  const { t, locale } = useT();
  const currentYear = new Date().getFullYear();

  if (years.length === 0) {
    return (
      <div className="kumo-card p-10 text-center">
        <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <h3 className="font-semibold mb-1">{t.expenses.archive_empty_title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.expenses.archive_empty_desc}
        </p>
      </div>
    );
  }

  const grandTotal = years.reduce((s, y) => s + y.total, 0);

  return (
    <div className="space-y-4">
      <div className="kumo-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <span>{t.expenses.archive_total_in}</span>
            <CurrencyInlineSelect value={displayCurrency} onChange={onChangeCurrency} />
          </div>
          <p className="text-2xl font-bold kumo-gradient-text">
            {formatMoney(grandTotal, displayCurrency, locale)}
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {years.length === 1
            ? t.expenses.archive_year_with_data
            : t.expenses.archive_years_with_data.replace('{n}', String(years.length))}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {years.map((y) => {
          const isCurrent = y.year === currentYear;
          const yearsAgo = currentYear - y.year;
          return (
            <button
              key={y.year}
              type="button"
              onClick={() => onSelectYear(y.year)}
              className="kumo-card p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-transform group"
            >
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-2xl font-bold tracking-tight">{y.year}</h3>
                {isCurrent ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                    {t.expenses.archive_active}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                    {yearsAgo === 1
                      ? t.expenses.archive_last_year
                      : t.expenses.archive_years_ago.replace('{n}', String(yearsAgo))}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold kumo-gradient-text mb-1">
                {formatMoney(y.total, displayCurrency, locale)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>
                  {y.count}{' '}
                  {y.count === 1 ? t.expenses.archive_one_expense : t.expenses.archive_n_expenses}
                </span>
                <span className="text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t.expenses.archive_see_detail}
                </span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
