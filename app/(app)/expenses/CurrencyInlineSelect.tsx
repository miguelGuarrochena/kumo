'use client';

import { Select } from '@/components/Select';
import { CURRENCIES, type Currency } from '@/lib/currency';

type CurrencyInlineSelectProps = {
  value: Currency;
  onChange: (v: string) => void;
};

// Select inline minimalista — se ve como texto subrayado punteado, no como caja.
export const CurrencyInlineSelect = ({ value, onChange }: CurrencyInlineSelectProps) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
      ariaLabel="Moneda de visualización"
      className="inline-block"
      renderTrigger={(_current, open) => (
        <span
          className={`font-medium cursor-pointer underline decoration-dotted underline-offset-2 transition-colors ${
            open
              ? 'text-sky-600 decoration-sky-400'
              : 'text-slate-500 dark:text-slate-300 decoration-slate-300 dark:decoration-slate-600 hover:text-sky-600 hover:decoration-sky-400'
          }`}
        >
          {value}
        </span>
      )}
    />
  );
};
