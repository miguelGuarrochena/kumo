'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Wallet, Stethoscope, Cake, Bell, Calendar as CalendarIcon,
} from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { formatMoney, type Currency } from '@/lib/currency';

type ExpenseCal = {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  expense_date: string;
  paid: boolean;
  categories: { name: string; color: string } | null;
};

type ReminderCal = {
  id: string;
  title: string;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: 'medical' | 'birthday' | 'generic';
};

type Props = {
  year: number;
  month: number; // 1-12
  startDate: string;
  endDate: string;
  expenses: ExpenseCal[];
  reminders: ReminderCal[];
  defaultCurrency: Currency;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const COLOR_DOT: Record<string, string> = {
  sky:      'bg-sky-400',
  lavender: 'bg-lavender-400',
  peach:    'bg-peach-300',
  mint:     'bg-mint-400',
  rose:     'bg-rose-300',
};

export function CalendarClient({
  year,
  month,
  expenses,
  reminders,
  defaultCurrency,
}: Props) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Construir grid: 6 filas x 7 columnas (42 días)
  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  // Indexar eventos por fecha YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { expenses: ExpenseCal[]; reminders: ReminderCal[] }>();

    for (const exp of expenses) {
      // Si el gasto tiene due_date, lo ubicamos ahí (es el "vencimiento")
      const date = exp.due_date ?? exp.expense_date;
      const entry = map.get(date) ?? { expenses: [], reminders: [] };
      entry.expenses.push(exp);
      map.set(date, entry);
    }

    for (const rem of reminders) {
      const entry = map.get(rem.reminder_date) ?? { expenses: [], reminders: [] };
      entry.reminders.push(rem);
      map.set(rem.reminder_date, entry);
    }

    return map;
  }, [expenses, reminders]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const goPrev = () => router.push(`/calendar?month=${shiftMonth(year, month, -1)}`);
  const goNext = () => router.push(`/calendar?month=${shiftMonth(year, month, 1)}`);
  const goToday = () => {
    const today = new Date().toISOString().slice(0, 7);
    router.push(`/calendar?month=${today}`);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) : null;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Calendario</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Todas tus fechas: vencimientos, citas y cumpleaños.
          </p>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:border-slate-300 dark:hover:border-slate-600 shrink-0"
        >
          Hoy
        </button>
      </header>

      <div className="kumo-card p-4 sm:p-5">
        {/* Header del mes */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold capitalize">{monthLabel}</h2>
          <button
            onClick={goNext}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAYS.map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            const events = eventsByDate.get(cell.dateStr);
            const isCurrentMonth = cell.month === month;
            const isToday = cell.dateStr === todayStr;
            const hasEvents = !!events && (events.expenses.length > 0 || events.reminders.length > 0);

            return (
              <button
                key={cell.dateStr}
                onClick={() => setSelectedDay(cell.dateStr)}
                className={`relative aspect-square p-1 sm:p-1.5 rounded-lg text-left transition-colors flex flex-col ${
                  !isCurrentMonth
                    ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    : isToday
                      ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-400 dark:ring-sky-500'
                      : hasEvents
                        ? 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className={`text-xs sm:text-sm font-medium ${isToday ? 'text-sky-700 dark:text-sky-300' : ''}`}>
                  {cell.day}
                </span>

                {/* Dots de eventos */}
                {events && (
                  <div className="mt-auto flex flex-wrap gap-0.5">
                    {events.expenses.slice(0, 3).map((e) => {
                      const isPending = e.due_date && !e.paid;
                      const dotCls = isPending
                        ? 'bg-peach-400'
                        : e.categories
                          ? COLOR_DOT[e.categories.color] ?? 'bg-slate-300'
                          : 'bg-slate-300';
                      return <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />;
                    })}
                    {events.reminders.slice(0, 3).map((r) => {
                      const dotCls =
                        r.reminder_type === 'medical'  ? 'bg-rose-400' :
                        r.reminder_type === 'birthday' ? 'bg-lavender-400' :
                        'bg-sky-400';
                      return <span key={r.id} className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />;
                    })}
                    {((events.expenses.length + events.reminders.length) > 6) && (
                      <span className="text-[8px] text-slate-400 leading-none">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
          <LegendDot color="bg-peach-400" label="Vencimiento" />
          <LegendDot color="bg-rose-400"  label="Médico" />
          <LegendDot color="bg-lavender-400" label="Cumpleaños" />
          <LegendDot color="bg-sky-400"   label="Otro" />
        </div>
      </div>

      {/* Sheet con detalle del día */}
      <DayDetailSheet
        dateStr={selectedDay}
        events={selectedEvents ?? null}
        defaultCurrency={defaultCurrency}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function DayDetailSheet({
  dateStr,
  events,
  defaultCurrency,
  onClose,
}: {
  dateStr: string | null;
  events: { expenses: ExpenseCal[]; reminders: ReminderCal[] } | null;
  defaultCurrency: Currency;
  onClose: () => void;
}) {
  if (!dateStr) return null;

  const date = new Date(dateStr + 'T12:00:00');
  const title = date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);

  return (
    <Sheet open={!!dateStr} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)}>
      {totalEvents === 0 ? (
        <div className="text-center py-8">
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Sin eventos este día.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events && events.reminders.length > 0 && (
            <Section title="Recordatorios">
              {events.reminders.map((r) => {
                const Icon =
                  r.reminder_type === 'medical'  ? Stethoscope :
                  r.reminder_type === 'birthday' ? Cake :
                  Bell;
                const toneCls =
                  r.reminder_type === 'medical'  ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' :
                  r.reminder_type === 'birthday' ? 'bg-lavender-100 dark:bg-lavender-500/20 text-lavender-500' :
                  'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300';
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2">
                    <div className={`w-9 h-9 rounded-lg ${toneCls} grid place-items-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      {r.reminder_time && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {r.reminder_time.slice(0, 5)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {events && events.expenses.length > 0 && (
            <Section title={events.reminders.length > 0 ? 'Gastos' : ''}>
              {events.expenses.map((e) => {
                const dotCls = e.categories
                  ? COLOR_DOT[e.categories.color] ?? 'bg-slate-300'
                  : 'bg-slate-300';
                const isPending = e.due_date && !e.paid;
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 grid place-items-center shrink-0">
                      <Wallet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                        {e.description || e.categories?.name || 'Gasto'}
                        {isPending && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-peach-100 dark:bg-peach-500/20 text-peach-400 font-medium">
                            Pendiente
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {e.categories?.name ?? 'Sin categoría'}
                      </p>
                    </div>
                    <p className="font-semibold text-sm whitespace-nowrap">
                      {formatMoney(Number(e.amount), e.currency as Currency)}
                    </p>
                  </div>
                );
              })}
            </Section>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {title}
        </h3>
      )}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">{children}</div>
    </div>
  );
}

// =====================================================================
// Helpers
// =====================================================================

function buildGrid(year: number, month: number): { day: number; month: number; year: number; dateStr: string }[] {
  // Grid de 6 filas × 7 columnas que arranca el lunes anterior al día 1 del mes
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstOfMonth.getDay() || 7; // 1=L, 7=D
  const startOffset = firstDayOfWeek - 1; // días a retroceder

  const cells: { day: number; month: number; year: number; dateStr: string }[] = [];
  const start = new Date(year, month - 1, 1 - startOffset);

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dateStr: toIso(d),
    });
  }

  return cells;
}

function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
