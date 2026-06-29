'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Tags,
  ShoppingCart,
  CalendarDays,
  BarChart3,
  Calculator,
  PiggyBank,
  Settings,
  LogOut,
} from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { WorkspaceSwitcher, type WorkspaceOption } from './WorkspaceSwitcher';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/client';
import { resetAnalytics } from '@/lib/analytics';

type Props = {
  userEmail: string;
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
};

export const Sidebar = ({ userEmail, workspaces, activeWorkspaceId }: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();

  const nav = [
    { href: '/dashboard',  label: t.nav.dashboard,    icon: LayoutDashboard },
    { href: '/expenses',   label: t.nav.expenses,     icon: Wallet },
    { href: '/budgets',    label: t.nav.budgets,      icon: PiggyBank },
    { href: '/metrics',    label: t.nav.metrics,      icon: BarChart3 },
    { href: '/calendar',   label: t.nav.calendar,     icon: CalendarDays },
    { href: '/shopping',   label: t.nav.shopping,     icon: ShoppingCart },
    { href: '/split',      label: t.nav.split,        icon: Calculator },
    { href: '/categories', label: t.nav.categories,   icon: Tags },
    { href: '/settings',   label: t.nav.settings,     icon: Settings },
  ] as const;

  const onSignOut = async () => {
    resetAnalytics();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 h-full bg-white/70 dark:bg-slate-900/60 backdrop-blur border-r border-slate-200 dark:border-slate-800 flex-col overflow-y-auto">
      <Link
        href="/dashboard"
        className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 hover:opacity-80 transition-opacity"
      >
        <CloudLogo className="w-8 h-8" />
        <span className="font-bold text-lg tracking-tight kumo-gradient-text">Kumo</span>
      </Link>

      <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800">
        <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} />
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href as never}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 truncate" title={userEmail}>
          {userEmail}
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t.nav.signOut}
        </button>
      </div>
    </aside>
  );
};
