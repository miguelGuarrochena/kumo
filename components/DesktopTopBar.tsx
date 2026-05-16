'use client';

import { ThemeToggle } from './ThemeToggle';

// Top bar inline para desktop. Está dentro del flow del layout, no flota.
// Mobile usa MobileHeader.

export function DesktopTopBar() {
  return (
    <header className="hidden lg:flex items-center justify-end gap-3 px-8 py-3 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur">
      <ThemeToggle compact />
    </header>
  );
}
