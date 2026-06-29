'use client';

import { ChevronDown } from 'lucide-react';
import { Select } from '@/components/Select';
import { CURRENCIES, type Currency } from '@/lib/currency';

type CurrencyInlineSelectProps = {
  value: Currency;
  onChange: (v: string) => void;
  /**
   * 'text': inline minimalista subrayado punteado (default — uso en linea de subtítulo)
   * 'pill': pill con borde, padding y chevron (uso en headers/topbars donde está aislado)
   */
  variant?: 'text' | 'pill';
};

export const CurrencyInlineSelect = ({ value, onChange, variant = 'text' }: CurrencyInlineSelectProps) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
      ariaLabel="Moneda de visualización"
      className="inline-block"
      renderTrigger={(_current, open) =>
        variant === 'pill' ? (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
              open
                ? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/50'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-500/40 dark:hover:text-sky-300'
            }`}
          >
            {value}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
              strokeWidth={2.5}
            />
          </span>
        ) : (
          <span
            className={`font-medium cursor-pointer underline decoration-dotted underline-offset-2 transition-colors ${
              open
                ? 'text-sky-600 decoration-sky-400'
                : 'text-slate-500 dark:text-slate-300 decoration-slate-300 dark:decoration-slate-600 hover:text-sky-600 hover:decoration-sky-400'
            }`}
          >
            {value}
          </span>
        )
      }
    />
  );
};
