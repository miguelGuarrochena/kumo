'use client';

import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { CURRENCIES } from '@/lib/currency';

// Dropdown simple para moneda — opciones cortas, no necesita portal ni búsqueda.
export const CurrencyPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, open, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
      >
        <span className="font-medium">{value}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                value === c.code ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium' : ''
              }`}
            >
              <span className="font-medium">{c.code}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
