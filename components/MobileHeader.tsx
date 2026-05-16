'use client';

import { CloudLogo } from './CloudLogo';
import { ThemeToggle } from './ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function MobileHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white/90 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <CloudLogo className="w-7" />
          <h1 className="font-bold tracking-tight kumo-gradient-text">Kumo</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 grid place-items-center font-medium text-sm"
            aria-label="Menú"
          >
            {userEmail.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-3 top-12 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 min-w-56 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Conectado como</p>
              <p className="text-sm font-medium truncate dark:text-slate-100">{userEmail}</p>
            </div>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </header>
  );
}
