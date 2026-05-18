'use client';

import { ThemeToggle } from './ThemeToggle';

// Posicionado en absolute para que fluya con el scroll en vez de quedar fijo arriba.
export const DesktopTopBar = () => (
  <div className="hidden lg:flex absolute top-4 right-4 z-10 items-center gap-2">
    <ThemeToggle compact />
  </div>
);
