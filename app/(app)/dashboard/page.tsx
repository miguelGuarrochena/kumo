import { createClient } from '@/lib/supabase/server';
import { Wallet, Bell, ShoppingCart, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Stats simples para el dashboard inicial
  const [{ count: expenseCount }, { count: reminderCount }, { count: shoppingCount }] =
    await Promise.all([
      supabase.from('expenses').select('*', { count: 'exact', head: true }),
      supabase.from('reminders').select('*', { count: 'exact', head: true }),
      supabase
        .from('shopping_items')
        .select('*', { count: 'exact', head: true })
        .eq('bought', false),
    ]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Hola';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName} <span className="text-2xl">👋</span>
        </h1>
        <p className="text-slate-500 mt-1">
          Bienvenido a tu nube. Esto es lo que tenés hoy.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Gastos registrados"
          value={expenseCount ?? 0}
          href="/expenses"
          tone="sky"
        />
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="Recordatorios"
          value={reminderCount ?? 0}
          href="/reminders"
          tone="lavender"
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5" />}
          label="Por comprar"
          value={shoppingCount ?? 0}
          href="/shopping"
          tone="mint"
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Calendario"
          value="Ver"
          href="/calendar"
          tone="peach"
        />
      </div>

      <section className="kumo-card p-6">
        <h2 className="font-semibold text-lg mb-2">Próximos pasos</h2>
        <p className="text-sm text-slate-500 mb-4">
          Esta es tu primera vez en Kumo. Te dejamos algunas categorías default — podés
          editarlas o crear nuevas.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/categories"
            className="text-sm px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
          >
            Ver categorías
          </Link>
          <Link
            href="/expenses"
            className="text-sm px-3 py-1.5 rounded-lg bg-lavender-100 text-lavender-500 hover:bg-lavender-200 transition-colors"
          >
            Cargar tu primer gasto
          </Link>
          <Link
            href="/settings"
            className="text-sm px-3 py-1.5 rounded-lg bg-peach-100 text-peach-400 hover:bg-peach-200 transition-colors"
          >
            Conectar WhatsApp
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  tone: 'sky' | 'lavender' | 'mint' | 'peach';
}) {
  const toneStyles = {
    sky: 'bg-sky-100 text-sky-700',
    lavender: 'bg-lavender-100 text-lavender-500',
    mint: 'bg-mint-100 text-mint-500',
    peach: 'bg-peach-100 text-peach-400',
  } as const;

  return (
    <Link href={href as never} className="kumo-card p-5 hover:scale-[1.02] transition-transform block">
      <div className={`w-10 h-10 rounded-lg ${toneStyles[tone]} grid place-items-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </Link>
  );
}
