import { createClient } from '@/lib/supabase/server';
import {
  Wallet, Bell, ShoppingCart, CalendarDays, Stethoscope, Cake,
  TrendingUp, AlertCircle, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { localeTag } from '@/lib/i18n/locale';
import { getRates, formatMoney, convertAmount, type Currency } from '@/lib/currency';
import { todayKey, parseLocalDate, daysBetween } from '@/lib/date';
import { getCurrentWorkspace } from '@/lib/workspace';

const DashboardPage = async () => {
  const supabase = await createClient();
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const dateLocale = localeTag(locale);
  const ctx = await getCurrentWorkspace();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rangos: mes actual + próximos 7 días
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = todayKey(now);
  const in7Days = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const [
    { count: expenseCount },
    { count: reminderCount },
    { count: shoppingCount },
    { data: settings },
    { data: selfContact },
    { data: monthExpenses },
    { data: dueExpenses },
    { data: upcomingReminders },
    { data: recentExpenses },
    rates,
  ] = await Promise.all([
    supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId),
    supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId).eq('bought', false),
    supabase.from('user_settings').select('onboarded, whatsapp_number, default_currency').eq('user_id', user?.id ?? '').maybeSingle(),
    // En workspaces compartidos hay un is_self por miembro: filtramos por user_id para traer el del viewer
    supabase.from('notification_contacts').select('phone').eq('workspace_id', ctx.workspaceId).eq('is_self', true).eq('user_id', user?.id ?? '').maybeSingle(),
    supabase
      .from('expenses')
      .select('amount, currency')
      .eq('workspace_id', ctx.workspaceId)
      .gte('expense_date', monthStart),
    supabase
      .from('expenses')
      .select('id, description, amount, currency, due_date, categories(name, color)')
      .eq('workspace_id', ctx.workspaceId)
      .not('due_date', 'is', null)
      .eq('paid', false)
      .gte('due_date', today)
      .lte('due_date', in7Days)
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('reminders')
      .select('id, title, reminder_date, reminder_time, reminder_type')
      .eq('workspace_id', ctx.workspaceId)
      .gte('reminder_date', today)
      .lte('reminder_date', in7Days)
      .order('reminder_date', { ascending: true })
      .limit(5),
    supabase
      .from('expenses')
      .select('id, description, amount, currency, expense_date, categories(name, color)')
      .eq('workspace_id', ctx.workspaceId)
      .order('expense_date', { ascending: false })
      .limit(5),
    getRates().catch(() => ({ rates: {} as Partial<Record<Currency, number>>, base: 'USD' as Currency, fetchedAt: 0 })),
  ]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? t.dashboard.title;
  const settingsTyped = settings as { onboarded?: boolean; whatsapp_number?: string | null; default_currency?: string } | null;
  const selfContactTyped = selfContact as { phone?: string | null } | null;

  const isOnboarded = settingsTyped?.onboarded ?? false;
  const hasExpense = (expenseCount ?? 0) > 0;
  const hasContact = !!selfContactTyped?.phone || !!settingsTyped?.whatsapp_number;
  const hasReminder = (reminderCount ?? 0) > 0;
  const showOnboarding = !isOnboarded;

  const displayCurrency = (settingsTyped?.default_currency ?? 'ARS') as Currency;

  // Calculo total del mes convertido a moneda preferida.
  // Si falta la tasa, no sumamos 0: ignoramos ese monto del total.
  const convert = (amount: number, currency: string): number | null =>
    convertAmount(amount, currency as Currency, displayCurrency, rates.rates);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthExpensesArr = (monthExpenses ?? []) as any[];
  const monthTotal = monthExpensesArr.reduce((sum, e) => {
    const c = convert(Number(e.amount), e.currency);
    return c === null ? sum : sum + c;
  }, 0);
  const monthCount = monthExpensesArr.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dueExpensesArr = (dueExpenses ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingRemArr = (upcomingReminders ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentArr = (recentExpenses ?? []) as any[];

  const hasUpcoming = dueExpensesArr.length > 0 || upcomingRemArr.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {firstName} <span className="text-2xl">👋</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.dashboard.subtitle}
        </p>
      </header>

      {showOnboarding && (
        <OnboardingChecklist
          hasExpense={hasExpense}
          hasContact={hasContact}
          hasReminder={hasReminder}
        />
      )}

      {/* Total del mes — hero card */}
      <Link
        href="/expenses"
        className="block kumo-card p-5 sm:p-6 hover:border-sky-300 dark:hover:border-sky-500/40 transition-colors group"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">
              {t.expenses.total_month}
            </p>
            <p className="text-3xl sm:text-4xl font-bold kumo-gradient-text break-all">
              {formatMoney(monthTotal, displayCurrency)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {t.expenses.n_expenses.replace('{n}', String(monthCount))} {t.expenses.in_currency} {displayCurrency}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 grid place-items-center shrink-0 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </Link>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          icon={<Wallet className="w-4 h-4" />}
          label={t.dashboard.stat_expenses}
          value={expenseCount ?? 0}
          href="/expenses"
          tone="sky"
        />
        <MiniStat
          icon={<ShoppingCart className="w-4 h-4" />}
          label={t.dashboard.stat_shopping}
          value={shoppingCount ?? 0}
          href="/shopping"
          tone="mint"
        />
        <MiniStat
          icon={<Bell className="w-4 h-4" />}
          label={t.dashboard.stat_reminders}
          value={reminderCount ?? 0}
          href="/calendar?view=upcoming"
          tone="lavender"
        />
      </div>

      {/* Próximos eventos (7 días) */}
      {hasUpcoming && (
        <div className="kumo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-peach-400" />
              {t.dashboard.upcoming_7_days}
            </h3>
            <Link
              href="/calendar?view=upcoming"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-0.5"
            >
              {t.dashboard.see_all}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {dueExpensesArr.map((e) => {
              const days = daysBetween(today, e.due_date);
              const label = relLabel(t, days);
              return (
                <div key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-peach-100 dark:bg-peach-500/20 text-peach-400 grid place-items-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.description || e.categories?.name || t.expenses.default_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className={days === 0 ? 'text-rose-500 font-medium' : ''}>{label}</span>
                      {' · '}{t.expenses.due_short} {formatShortDate(e.due_date, dateLocale)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
                    {formatMoney(Number(e.amount), e.currency as Currency)}
                  </p>
                </div>
              );
            })}
            {upcomingRemArr.map((r) => {
              const Icon = r.reminder_type === 'medical' ? Stethoscope : r.reminder_type === 'birthday' ? Cake : Bell;
              const tone = r.reminder_type === 'medical'
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500'
                : r.reminder_type === 'birthday'
                  ? 'bg-lavender-100 dark:bg-lavender-500/20 text-lavender-500'
                  : 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300';
              const days = daysBetween(today, r.reminder_date);
              const label = relLabel(t, days);
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-lg ${tone} grid place-items-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className={days === 0 ? 'text-rose-500 font-medium' : ''}>{label}</span>
                      {' · '}{formatShortDate(r.reminder_date, dateLocale)}
                      {r.reminder_time && ` · ${String(r.reminder_time).slice(0, 5)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Últimos gastos */}
      {recentArr.length > 0 && (
        <div className="kumo-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-sky-500" />
              {t.dashboard.recent_expenses}
            </h3>
            <Link
              href="/expenses?view=all"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-0.5"
            >
              {t.dashboard.see_all}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentArr.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 grid place-items-center shrink-0">
                  <Wallet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {e.description || e.categories?.name || t.expenses.default_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {e.categories?.name ?? t.expenses.no_category} · {formatShortDate(e.expense_date, dateLocale)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
                  {formatMoney(Number(e.amount), e.currency as Currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick action a Calendario si no hay nada que mostrar */}
      {!hasUpcoming && recentArr.length === 0 && (
        <Link
          href="/calendar"
          className="block kumo-card p-5 hover:border-peach-300 dark:hover:border-peach-500/40 transition-colors text-center"
        >
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.dashboard.empty_hint}
          </p>
        </Link>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const relLabel = (t: Awaited<ReturnType<typeof getMessages>>, days: number): string => {
  if (days === 0) return t.calendar.rel_today;
  if (days === 1) return t.calendar.rel_tomorrow;
  return t.calendar.rel_in_days.replace('{n}', String(days));
};

const formatShortDate = (dateStr: string, locale: string): string => {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
};

const MiniStat = ({
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
}) => {
  const toneStyles = {
    sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
    mint:     'bg-mint-100 text-mint-500 dark:bg-mint-500/20',
    peach:    'bg-peach-100 text-peach-400 dark:bg-peach-500/20',
  } as const;

  return (
    <Link
      href={href as never}
      className="kumo-card p-3 sm:p-4 hover:scale-[1.02] transition-transform block"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${toneStyles[tone]} grid place-items-center shrink-0`}>
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold truncate">
          {label}
        </p>
      </div>
      <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
    </Link>
  );
};

export default DashboardPage;
