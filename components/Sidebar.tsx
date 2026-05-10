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
  Settings,
  LogOut,
} from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/expenses',      label: 'Gastos',         icon: Wallet },
  { href: '/categories',    label: 'Categorías',    icon: Tags },
  { href: '/reminders',     label: 'Recordatorios', icon: Bell },
  { href: '/shopping',      label: 'Compras',       icon: ShoppingCart },
  { href: '/calendar',      label: 'Calendario',    icon: CalendarDays },
  { href: '/settings',      label: 'Configuración', icon: Settings },
] as const;

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <aside className="w-64 bg-white/70 backdrop-blur border-r border-slate-200 flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-slate-100">
        <CloudLogo className="w-8 h-8" />
        <div>
          <h1 className="font-bold text-lg tracking-tight kumo-gradient-text">Kumo</h1>
          <p className="text-[10px] text-slate-400 -mt-0.5">tus gastos en orden</p>
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
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 text-xs text-slate-500 truncate" title={userEmail}>
          {userEmail}
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
