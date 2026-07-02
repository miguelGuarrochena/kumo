'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet, ShoppingCart, CalendarDays, Calculator, Plus,
} from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { openQuickAdd } from '@/lib/quickAdd';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Wallet;
};

export const MobileNav = () => {
  const pathname = usePathname();
  const { t } = useT();

  // 4 destinos + botón central de carga rápida. "Inicio" sale del nav: se
  // vuelve con el logo del header o con atrás, y Movimientos es la home real.
  const left: NavItem[] = [
    { href: '/expenses',  label: t.mobileNav.expenses, icon: Wallet },
    { href: '/calendar',  label: t.mobileNav.calendar, icon: CalendarDays },
  ];
  const right: NavItem[] = [
    { href: '/shopping',  label: t.mobileNav.shopping, icon: ShoppingCart },
    { href: '/split',     label: t.mobileNav.split,    icon: Calculator },
  ];

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <li key={href}>
        <Link
          href={href as never}
          className={`flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
            active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 h-16">
        {left.map(renderItem)}
        <li className="relative">
          <button
            type="button"
            onClick={openQuickAdd}
            aria-label={t.quickAdd.fab_label}
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-12 h-12 rounded-full kumo-gradient text-white shadow-lg shadow-sky-500/30 grid place-items-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
          <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 pointer-events-none">
            {t.quickAdd.title}
          </span>
        </li>
        {right.map(renderItem)}
      </ul>
    </nav>
  );
};
