'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, ShoppingCart, Bell, Settings,
} from 'lucide-react';
import { useT } from '@/lib/i18n/client';

export const MobileNav = () => {
  const pathname = usePathname();
  const { t } = useT();

  const nav = [
    { href: '/dashboard', label: t.mobileNav.home,      icon: LayoutDashboard },
    { href: '/expenses',  label: t.mobileNav.expenses,  icon: Wallet },
    { href: '/shopping',  label: t.mobileNav.shopping,  icon: ShoppingCart },
    { href: '/reminders', label: t.mobileNav.reminders, icon: Bell },
    { href: '/settings',  label: t.mobileNav.settings,  icon: Settings },
  ] as const;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 h-16">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
                  active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
