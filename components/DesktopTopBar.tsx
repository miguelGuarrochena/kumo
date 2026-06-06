'use client';

import { Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

// Posicionado en absolute para que fluya con el scroll en vez de quedar fijo arriba.
// Incluye un botón "Buscar" sutil que abre el command palette (dispara Cmd+K).
export const DesktopTopBar = () => {
  const triggerSearch = () => {
    // Disparamos el atajo programáticamente. El CommandPalette escucha
    // window keydown y lo intercepta.
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="hidden lg:flex absolute top-4 right-4 z-10 items-center gap-2">
      <button
        type="button"
        onClick={triggerSearch}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-sm text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        aria-label="Buscar"
        title="Buscar (⌘K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Buscar…</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
      <ThemeToggle compact />
    </div>
  );
};
