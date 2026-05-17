'use client';

import { ThemeToggle } from './ThemeToggle';

export const DesktopTopBar = () => (
  <div className="hidden lg:flex fixed top-4 right-4 z-30 items-center gap-2 pointer-events-none">
    <div className="pointer-events-auto">
      <ThemeToggle compact />
    </div>
  </div>
);
