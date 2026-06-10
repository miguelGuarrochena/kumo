'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Tags, FileText, Shield, LogOut, Check, BarChart3 } from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { ThemeToggle } from './ThemeToggle';
import { WorkspaceSwitcher, type WorkspaceOption } from './WorkspaceSwitcher';
import { createClient } from '@/lib/supabase/client';
import { resetAnalytics } from '@/lib/analytics';
import { useT, setLocale } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/types';

type Props = {
  userEmail: string;
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
};

const LANGS: { value: Locale; label: string; flag: string }[] = [
  { value: 'es', label: 'Español', flag: 'ES' },
  { value: 'en', label: 'English', flag: 'EN' },
];

export const MobileHeader = ({ userEmail, workspaces, activeWorkspaceId }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = userEmail.charAt(0).toUpperCase();

  const onSignOut = async () => {
    resetAnalytics();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  const onBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard');
  };

  const isDashboard = pathname === '/dashboard';

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white/90 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 pt-[env(safe-area-inset-top)]">
      <div className="relative flex items-center h-14 px-4">
        <div className="flex flex-1 items-center justify-start min-w-0">
          {!isDashboard && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-full grid place-items-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={t.common.back}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <Link
          href="/dashboard"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 max-w-[40%] hover:opacity-80 transition-opacity"
        >
          <CloudLogo className="w-6 shrink-0" />
          <span className="font-bold text-base tracking-tight kumo-gradient-text truncate">Kumo</span>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="shrink-0 size-9 rounded-full overflow-hidden bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center font-semibold text-sm leading-none ring-1 ring-sky-200/80 dark:ring-sky-700/50 hover:ring-sky-300 dark:hover:ring-sky-600 transition-shadow"
            aria-label={t.menu.open}
            title={userEmail}
          >
            <span aria-hidden="true">{initial}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed right-3 top-14 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 min-w-72 overflow-hidden">
            <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-700">
              <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} />
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2.5 px-1">
                {t.menu.connectedAs}
              </p>
              <p className="text-sm font-medium truncate dark:text-slate-100 px-1">{userEmail}</p>
            </div>

            <MenuItem href="/settings" icon={Settings} onClick={() => setMenuOpen(false)}>
              {t.menu.settings}
            </MenuItem>
            <MenuItem href="/categories" icon={Tags} onClick={() => setMenuOpen(false)}>
              {t.menu.categories}
            </MenuItem>
            <MenuItem href="/metrics" icon={BarChart3} onClick={() => setMenuOpen(false)}>
              {t.menu.metrics}
            </MenuItem>

            <div className="h-px bg-slate-100 dark:bg-slate-700/70 my-1" />

            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                {t.menu.language}
              </p>
            </div>
            {LANGS.map((l) => {
              const active = l.value === locale;
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (l.value !== locale) setLocale(l.value);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {l.flag}
                    </span>
                    {l.label}
                  </span>
                  {active && <Check className="w-4 h-4 text-sky-500" />}
                </button>
              );
            })}

            <div className="h-px bg-slate-100 dark:bg-slate-700/70 my-1" />

            <MenuItem href="/legal/privacy" icon={Shield} onClick={() => setMenuOpen(false)}>
              {t.menu.privacy}
            </MenuItem>
            <MenuItem href="/legal/terms" icon={FileText} onClick={() => setMenuOpen(false)}>
              {t.menu.terms}
            </MenuItem>

            <div className="h-px bg-slate-100 dark:bg-slate-700/70 my-1" />

            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <LogOut className="w-4 h-4" />
              {t.nav.signOut}
            </button>
          </div>
        </>
      )}
    </header>
  );
};

type MenuItemProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  children: React.ReactNode;
};

const MenuItem = ({ href, icon: Icon, onClick, children }: MenuItemProps) => (
  <Link
    href={href as never}
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
  >
    <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
    {children}
  </Link>
);
