import { createClient } from '@/lib/supabase/server';
import { Wallet, Bell, ShoppingCart, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: expenseCount },
    { count: reminderCount },
    { count: shoppingCount },
    { data: settings },
    { data: selfContact },
  ] = await Promise.all([
    supabase.from('expenses').select('*', { count: 'exact', head: true }),
    supabase.from('reminders').select('*', { count: 'exact', head: true }),
    supabase
      .from('shopping_items')
      .select('*', { count: 'exact', head: true })
      .eq('bought', false),
    supabase.from('user_settings').select('onboarded, whatsapp_number').eq('user_id', user?.id ?? '').maybeSingle(),
    supabase.from('notification_contacts').select('phone').eq('user_id', user?.id ?? '').eq('is_self', true).maybeSingle(),
  ]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Hola';
  const settingsTyped = settings as { onboarded?: boolean; whatsapp_number?: string | null } | null;
  const selfContactTyped = selfContact as { phone?: string | null } | null;

  const isOnboarded = settingsTyped?.onboarded ?? false;
  const hasExpense = (expenseCount ?? 0) > 0;
  const hasContact =
    !!selfContactTyped?.phone || !!settingsTyped?.whatsapp_number;
  const hasReminder = (reminderCount ?? 0) > 0;

  // El onboarding se muestra solo si el usuario no lo completó/salteó
  const showOnboarding = !isOnboarded;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {firstName} <span className="text-2xl">👋</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Bienvenido a tu nube. Esto es lo que tenés hoy.
        </p>
      </header>

      {showOnboarding && (
        <OnboardingChecklist
          hasExpense={hasExpense}
          hasContact={hasContact}
          hasReminder={hasReminder}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Gastos"
          value={expenseCount ?? 0}
          href="/expenses"
          tone="sky"
        />
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="Recordatorios"
          value={reminderCount ?? 0}
          href="/calendar?view=upcoming"
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
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
    mint: 'bg-mint-100 text-mint-500 dark:bg-mint-500/20',
    peach: 'bg-peach-100 text-peach-400 dark:bg-peach-500/20',
  } as const;

  return (
    <Link href={href as never} className="kumo-card p-4 sm:p-5 hover:scale-[1.02] transition-transform block">
      <div className={`w-10 h-10 rounded-lg ${toneStyles[tone]} grid place-items-center mb-3`}>
        {icon}
      </div>
      <div className="text-xl sm:text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </Link>
  );
}
