'use client';

import { Search } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { ThemeToggle } from './ThemeToggle';
import { openCommandPalette } from '@/lib/commandPalette';

// Posicionado en absolute para que fluya con el scroll en vez de quedar fijo arriba.
// Incluye un botón "Buscar" sutil que abre el command palette.
export const DesktopTopBar = () => {
  const { t } = useT();

  return (
    <div className="hidden lg:flex absolute top-4 right-4 z-10 items-center gap-2">
      <button
        type="button"
        onClick={() => openCommandPalette()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-sm text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        aria-label={t.command.search_label}
        title={t.command.search_title}
      >
        <Search className="w-3.5 h-3.5" />
        <span>{t.common.search}…</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
      <ThemeToggle compact />
    </div>
  );
};
