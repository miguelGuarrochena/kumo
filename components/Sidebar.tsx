'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Tags,
  Bell,
  ShoppingCart,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/client';
import { resetAnalytics } from '@/lib/analytics';

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();

  const NAV = [
    { href: '/dashboard',  label: t.nav.dashboard,    icon: LayoutDashboard },
    { href: '/expenses',   label: t.nav.expenses,     icon: Wallet },
    { href: '/metrics',    label: t.nav.metrics,      icon: BarChart3 },
    { href: '/categories', label: t.nav.categories,   icon: Tags },
    { href: '/reminders',  label: t.nav.reminders,    icon: Bell },
    { href: '/shopping',   label: t.nav.shopping,     icon: ShoppingCart },
    { href: '/calendar',   label: t.nav.calendar,     icon: CalendarDays },
    { href: '/settings',   label: t.nav.settings,     icon: Settings },
  ] as const;

  const onSignOut = async () => {
    resetAnalytics();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <aside className="hidden lg:flex w-64 bg-white/70 dark:bg-slate-900/60 backdrop-blur border-r border-slate-200 dark:border-slate-800 flex-col sticky top-0 h-screen">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <CloudLogo className="w-8 h-8" />
        <div>
          <h1 className="font-bold text-lg tracking-tight kumo-gradient-text">Kumo</h1>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
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

      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
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
}
