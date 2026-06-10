'use client';

import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import type { Filters } from './FiltersSheet';
import { buildExportUrl } from './utils';

type ExportMenuProps = { filters: Filters; label: string };

// Botón con menú desplegable Excel / CSV
export const ExportMenu = ({ filters, label }: ExportMenuProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, open, () => setOpen(false));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium">{label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 right-0 top-full mt-1 min-w-[10rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden py-1"
        >
          <a
            href={buildExportUrl(filters, 'xlsx')}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
          >
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 w-9">XLSX</span>
            Excel
          </a>
          <a
            href={buildExportUrl(filters, 'csv')}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
          >
            <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 w-9">CSV</span>
            CSV plano
          </a>
        </div>
      )}
    </div>
  );
};
