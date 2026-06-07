'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Wallet, Stethoscope, Cake, Bell, Calendar as CalendarIcon,
  Plus, Check, Pencil, Trash2, Users,
} from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatMoney, type Currency } from '@/lib/currency';
import { upsertReminder, deleteReminder } from '@/app/(app)/reminders/actions';
import { track } from '@/lib/analytics';
import { buildHolidayIndex, COUNTRY_LABEL, type Country, type Holiday } from '@/lib/holidays';
import { useT } from '@/lib/i18n/client';

type ReminderType = 'medical' | 'birthday' | 'generic';

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
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: ReminderType;
  is_recurring: boolean;
  notify_days_before: number;
  notify_contact_ids: string[];
};

type ContactLite = {
  id: string;
  name: string;
  relationship: string;
  is_self: boolean;
  phone: string | null;
};

export type WorkspaceLite = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type Props = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  expenses: ExpenseCal[];
  reminders: ReminderCal[];
  allReminders: ReminderCal[];
  contacts: ContactLite[];
  defaultCurrency: Currency;
  initialView?: ViewMode;
  country?: Country;
  workspaces: WorkspaceLite[];
  activeWorkspaceId: string;
};

type ViewMode = 'month' | 'year' | 'upcoming' | 'past';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const COLOR_DOT: Record<string, string> = {
  sky:      'bg-sky-500',
  lavender: 'bg-lavender-500',
  peach:    'bg-peach-400',
  mint:     'bg-mint-500',
  rose:     'bg-rose-400',
};

const TYPE_META = {
  medical:  { label: 'Médico',     icon: Stethoscope, dot: 'bg-rose-500',     tone: 'rose' },
  birthday: { label: 'Cumpleaños', icon: Cake,        dot: 'bg-lavender-500', tone: 'lavender' },
  generic:  { label: 'Otro',       icon: Bell,        dot: 'bg-sky-500',      tone: 'sky' },
} as const;

const TONE_STYLES: Record<string, string> = {
  rose:     'bg-rose-100 text-rose-500 dark:bg-rose-500/20',
  lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
  sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
};

// Normaliza fechas que puedan venir como "YYYY-MM-DD" o "YYYY-MM-DDTHH:..."
const dayKey = (s: string | null | undefined): string => (s ?? '').slice(0, 10);

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const WS_VISIBILITY_KEY = 'kumo-calendar-ws';

const WS_COLOR_DOT: Record<string, string> = {
  sky:      'bg-sky-500',
  lavender: 'bg-lavender-500',
  peach:    'bg-peach-400',
  mint:     'bg-mint-500',
  rose:     'bg-rose-400',
  amber:    'bg-amber-400',
  fuchsia:  'bg-fuchsia-500',
  emerald:  'bg-emerald-500',
  indigo:   'bg-indigo-500',
  slate:    'bg-slate-400',
};

export const CalendarClient = ({
  year,
  month,
  expenses: expensesRaw,
  reminders: remindersRaw,
  allReminders: allRemindersRaw,
  contacts,
  defaultCurrency,
  initialView = 'month',
  country = 'AR',
  workspaces,
  activeWorkspaceId,
}: Props) => {
  const [visibleWs, setVisibleWs] = useState<Set<string>>(() => new Set([activeWorkspaceId]));

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WS_VISIBILITY_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        const valid = ids.filter((id) => workspaces.some((w) => w.id === id));
        if (valid.length > 0) {
          setVisibleWs(new Set(valid));
          return;
        }
      }
    } catch {}
    setVisibleWs(new Set([activeWorkspaceId]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWs = (id: string) => {
    setVisibleWs((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) next.add(activeWorkspaceId);
      try { localStorage.setItem(WS_VISIBILITY_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const expenses = useMemo(
    () => expensesRaw.filter((e) => visibleWs.has((e as ExpenseCal & { workspace_id: string }).workspace_id)),
    [expensesRaw, visibleWs],
  );
  const reminders = useMemo(
    () => remindersRaw.filter((r) => visibleWs.has((r as ReminderCal & { workspace_id: string }).workspace_id)),
    [remindersRaw, visibleWs],
  );
  const allReminders = useMemo(
    () => allRemindersRaw.filter((r) => visibleWs.has((r as ReminderCal & { workspace_id: string }).workspace_id)),
    [allRemindersRaw, visibleWs],
  );

  const wsById = useMemo(() => {
    const m = new Map<string, WorkspaceLite>();
    for (const w of workspaces) m.set(w.id, w);
    return m;
  }, [workspaces]);
  const router = useRouter();
  const { t } = useT();
  const [view, setView] = useState<ViewMode>(initialView);

  const holidayIndex = useMemo(() => buildHolidayIndex(country), [country]);
  const getHolidayForDate = (dateStr: string): Holiday | null => holidayIndex.get(dateStr) ?? null;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<ReminderCal | null>(null);
  const [toDelete, setToDelete] = useState<ReminderCal | null>(null);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { expenses: ExpenseCal[]; reminders: ReminderCal[] }>();
    for (const exp of expenses) {
      const key = dayKey(exp.due_date ?? exp.expense_date);
      const entry = map.get(key) ?? { expenses: [], reminders: [] };
      entry.expenses.push(exp);
      map.set(key, entry);
    }
    for (const rem of reminders) {
      const key = dayKey(rem.reminder_date);
      const entry = map.get(key) ?? { expenses: [], reminders: [] };
      entry.reminders.push(rem);
      map.set(key, entry);
    }
    return map;
  }, [expenses, reminders]);

  const today = todayKey();

  const upcoming = useMemo(
    () => allReminders.filter((r) => dayKey(r.reminder_date) >= today),
    [allReminders, today],
  );
  const past = useMemo(
    () => allReminders.filter((r) => dayKey(r.reminder_date) < today).slice().reverse(),
    [allReminders, today],
  );

  const contactsById = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts],
  );

  const goPrev = () => router.push(`/calendar?month=${shiftMonth(year, month, -1)}`);
  const goNext = () => router.push(`/calendar?month=${shiftMonth(year, month, 1)}`);
  const goToday = () => {
    const t = new Date();
    router.push(`/calendar?month=${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) : null;

  const onDeleteConfirm = async () => {
    if (!toDelete) return;
    const result = await deleteReminder(toDelete.id);
    if (result.ok) {
      toast.success('Recordatorio eliminado');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Error');
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.calendar.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {t.calendar.subtitle}
          </p>
        </div>
        <button
          onClick={() => setEditingReminder({} as ReminderCal)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.calendar.new}</span>
        </button>
      </header>

      {workspaces.length > 1 && (
        <div className="kumo-card p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Mostrar:</span>
          {workspaces.map((w) => {
            const checked = visibleWs.has(w.id);
            const dotClass = WS_COLOR_DOT[w.color] ?? 'bg-slate-400';
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => toggleWs(w.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  checked
                    ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dotClass} ${checked ? '' : 'opacity-40'}`} />
                {w.name}
                {checked && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        <TabButton active={view === 'month'}    onClick={() => setView('month')}>{t.calendar.tab_month}</TabButton>
        <TabButton active={view === 'year'}     onClick={() => setView('year')}>{t.calendar.tab_year}</TabButton>
        <TabButton active={view === 'upcoming'} onClick={() => setView('upcoming')}>
          <span className="hidden sm:inline">{t.calendar.tab_upcoming}</span>
          <span className="sm:hidden">{t.calendar.tab_upcoming_short}</span>
          {' · '}{upcoming.length}
        </TabButton>
        <TabButton active={view === 'past'}     onClick={() => setView('past')}>
          <span className="hidden sm:inline">{t.calendar.tab_past}</span>
          <span className="sm:hidden">{t.calendar.tab_past_short}</span>
          {' · '}{past.length}
        </TabButton>
      </div>

      {view === 'month' && (
        <div className="kumo-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goPrev}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold capitalize">{monthLabel}</h2>
              <button
                onClick={goToday}
                className="text-[11px] px-2 py-1 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 dark:text-slate-400 dark:hover:text-sky-400"
              >
                Hoy
              </button>
            </div>
            <button
              onClick={goNext}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

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

          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              const events = eventsByDate.get(cell.dateStr);
              const isCurrentMonth = cell.month === month;
              const isToday = cell.dateStr === today;
              const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);
              const hasEvents = totalEvents > 0;
              const holiday = getHolidayForDate(cell.dateStr);

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedDay(cell.dateStr)}
                  className={`relative min-h-[3rem] sm:min-h-[6rem] p-1 sm:p-1.5 rounded-lg text-left transition-colors flex flex-col overflow-hidden ${
                    !isCurrentMonth
                      ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : isToday
                        ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-400 dark:ring-sky-500'
                        : holiday && isCurrentMonth
                          ? 'bg-amber-50 dark:bg-amber-900/15 hover:bg-amber-100 dark:hover:bg-amber-900/25'
                          : hasEvents
                            ? 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                  title={holiday ? holiday.name : undefined}
                >
                  <span className={`text-xs sm:text-sm font-semibold flex items-center gap-1 ${
                    isToday
                      ? 'text-sky-700 dark:text-sky-300'
                      : holiday && isCurrentMonth
                        ? 'text-amber-700 dark:text-amber-400'
                        : ''
                  }`}>
                    {cell.day}
                    {holiday && isCurrentMonth && (
                      <span className="w-1 h-1 rounded-full bg-amber-500" aria-label="Feriado" />
                    )}
                  </span>
                  {holiday && isCurrentMonth && (
                    <span className="hidden sm:block text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold leading-tight truncate">
                      {holiday.name}
                    </span>
                  )}

                  {events && (
                    <>
                      {/* MOBILE: solo dots, sin texto */}
                      <div className="sm:hidden mt-auto flex flex-wrap gap-0.5">
                        {events.reminders.slice(0, 3).map((r) => (
                          <span
                            key={r.id}
                            className={`w-1.5 h-1.5 rounded-full ${TYPE_META[r.reminder_type].dot}`}
                          />
                        ))}
                        {events.expenses.slice(0, 3).map((e) => {
                          const cls = e.due_date && !e.paid
                            ? 'bg-peach-400'
                            : e.categories
                              ? COLOR_DOT[e.categories.color] ?? 'bg-slate-400'
                              : 'bg-slate-400';
                          return <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${cls}`} />;
                        })}
                        {totalEvents > 6 && (
                          <span className="text-[8px] text-slate-500 dark:text-slate-400">
                            +{totalEvents - 6}
                          </span>
                        )}
                      </div>

                      {/* DESKTOP: lista vertical de hasta 3 eventos con nombres */}
                      <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                        {events.reminders.slice(0, 3).map((r) => (
                          <DayLabel
                            key={r.id}
                            dotCls={TYPE_META[r.reminder_type].dot}
                            text={r.title}
                          />
                        ))}
                        {events.expenses.slice(0, Math.max(0, 3 - events.reminders.length)).map((e) => {
                          const cls = e.due_date && !e.paid
                            ? 'bg-peach-400'
                            : e.categories
                              ? COLOR_DOT[e.categories.color] ?? 'bg-slate-400'
                              : 'bg-slate-400';
                          return (
                            <DayLabel
                              key={e.id}
                              dotCls={cls}
                              text={e.description || e.categories?.name || 'Gasto'}
                            />
                          );
                        })}
                        {totalEvents > 3 && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-1">
                            +{totalEvents - 3} más
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
            <LegendDot color="bg-peach-400" label="Vencimiento" />
            <LegendDot color="bg-rose-500"  label="Médico" />
            <LegendDot color="bg-lavender-500" label="Cumpleaños" />
            <LegendDot color="bg-sky-500"   label="Otro" />
            <LegendDot color="bg-amber-500" label={`Feriado ${COUNTRY_LABEL[country]}`} />
          </div>
        </div>
      )}

      {view === 'year' && (
        <YearView
          year={year}
          eventsByDate={eventsByDate}
          holidayIndex={holidayIndex}
          today={today}
          onMonthClick={(m) => {
            setView('month');
            router.push(`/calendar?month=${year}-${String(m).padStart(2, '0')}`);
          }}
          onDayClick={setSelectedDay}
        />
      )}

      {(view === 'upcoming' || view === 'past') && (
        <AgendaList
          items={view === 'upcoming' ? upcoming : past}
          contactsById={contactsById}
          today={today}
          onEdit={setEditingReminder}
          onDelete={setToDelete}
          emptyMessage={
            view === 'upcoming'
              ? 'Sin eventos próximos. Tocá "Nuevo" para crear uno.'
              : 'Sin eventos pasados.'
          }
        />
      )}

      <DayDetailSheet
        dateStr={selectedDay}
        events={selectedEvents ?? null}
        contacts={contacts}
        contactsById={contactsById}
        defaultCurrency={defaultCurrency}
        holidayIndex={holidayIndex}
        onClose={() => setSelectedDay(null)}
        onEdit={(r) => {
          setSelectedDay(null);
          setEditingReminder(r);
        }}
        onDelete={(r) => {
          setSelectedDay(null);
          setToDelete(r);
        }}
      />

      <FullReminderSheet
        open={editingReminder !== null}
        reminder={editingReminder && editingReminder.id ? editingReminder : null}
        contacts={contacts}
        onClose={() => setEditingReminder(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDeleteConfirm}
        title="Borrar recordatorio"
        description={`¿Borrar "${toDelete?.title}"? No se puede deshacer.`}
      />
    </div>
  );
};

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400'
    }`}
  >
    {children}
  </button>
);

const DayLabel = ({ dotCls, text }: { dotCls: string; text: string }) => (
  <div className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-900/40 min-w-0">
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
    <span className="truncate">{text}</span>
  </div>
);

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-full ${color}`} />
    {label}
  </span>
);

type AgendaListProps = {
  items: ReminderCal[];
  contactsById: Record<string, ContactLite>;
  today: string;
  onEdit: (r: ReminderCal) => void;
  onDelete: (r: ReminderCal) => void;
  emptyMessage: string;
};

const AgendaList = ({ items, contactsById, today, onEdit, onDelete, emptyMessage }: AgendaListProps) => {
  const grouped = useMemo(() => groupByMonth(items), [items]);

  if (items.length === 0) {
    return (
      <div className="kumo-card p-10 text-center">
        <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([month, list]) => (
        <div key={month}>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1">
            {month}
          </h3>
          <div className="kumo-card divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
            {list.map((r) => (
              <AgendaRow
                key={r.id}
                reminder={r}
                contactsById={contactsById}
                today={today}
                onEdit={() => onEdit(r)}
                onDelete={() => onDelete(r)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const AgendaRow = ({
  reminder,
  contactsById,
  today,
  onEdit,
  onDelete,
}: {
  reminder: ReminderCal;
  contactsById: Record<string, ContactLite>;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const meta = TYPE_META[reminder.reminder_type];
  const Icon = meta.icon;
  const toneCls = TONE_STYLES[meta.tone];

  const reminderKey = dayKey(reminder.reminder_date);
  const diffDays = daysBetween(today, reminderKey);

  const diffLabel =
    diffDays === 0  ? 'Hoy' :
    diffDays === 1  ? 'Mañana' :
    diffDays > 0    ? `En ${diffDays} días` :
    diffDays === -1 ? 'Ayer' :
                      `Hace ${Math.abs(diffDays)} días`;

  const notifyContactNames = reminder.notify_contact_ids
    .map((id) => contactsById[id]?.name)
    .filter(Boolean) as string[];

  return (
    <div className="p-3.5 flex items-center gap-3 group">
      <div className={`w-10 h-10 rounded-xl ${toneCls} grid place-items-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm truncate">{reminder.title}</p>
          {reminder.is_recurring && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lavender-100 dark:bg-lavender-500/20 text-lavender-500 font-medium">
              Anual
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          {formatDateLong(reminder.reminder_date)}
          {reminder.reminder_time && ` · ${reminder.reminder_time.slice(0, 5)}`}
          {' · '}
          <span className={diffDays === 0 ? 'text-rose-500 font-medium' : ''}>{diffLabel}</span>
        </p>
        {notifyContactNames.length > 0 && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate flex items-center gap-1">
            <Users className="w-3 h-3" />
            Avisar a: {notifyContactNames.join(', ')}
          </p>
        )}
      </div>
      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

type DayDetailSheetProps = {
  dateStr: string | null;
  events: { expenses: ExpenseCal[]; reminders: ReminderCal[] } | null;
  contacts: ContactLite[];
  contactsById: Record<string, ContactLite>;
  defaultCurrency: Currency;
  holidayIndex: Map<string, Holiday>;
  onClose: () => void;
  onEdit: (r: ReminderCal) => void;
  onDelete: (r: ReminderCal) => void;
};

const DayDetailSheet = ({
  dateStr,
  events,
  contacts,
  defaultCurrency: _defaultCurrency,
  holidayIndex,
  onClose,
  onEdit,
  onDelete,
}: DayDetailSheetProps) => {
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!dateStr) setCreating(false);
  }, [dateStr]);

  if (!dateStr) return null;

  const title = formatDateFull(dateStr);
  const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);
  const holiday = holidayIndex.get(dateStr) ?? null;
  const todayStr = todayKey();
  const isPast = dateStr < todayStr;

  if (creating) {
    return (
      <Sheet open={!!dateStr} onClose={onClose} title="Nuevo recordatorio">
        <QuickReminderForm
          dateStr={dateStr}
          contacts={contacts}
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            onClose();
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={!!dateStr} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)}>
      <div className="space-y-4">
        {holiday && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-medium">Feriado</span>
            <span className="text-amber-600 dark:text-amber-300">— {holiday.name}</span>
          </div>
        )}

        {!isPast ? (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Nuevo recordatorio en este día</span>
          </button>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2 italic">
            No se pueden crear eventos en fechas pasadas. Podés editar o borrar los existentes.
          </div>
        )}

        {totalEvents === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Sin eventos este día.</p>
          </div>
        ) : (
          <>
            {events && events.reminders.length > 0 && (
              <Section title="Recordatorios">
                {events.reminders.map((r) => {
                  const meta = TYPE_META[r.reminder_type];
                  const Icon = meta.icon;
                  const toneCls = TONE_STYLES[meta.tone];
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2 group">
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
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                          aria-label="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(r)}
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-500"
                          aria-label="Borrar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                    ? COLOR_DOT[e.categories.color] ?? 'bg-slate-400'
                    : 'bg-slate-400';
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
          </>
        )}
      </div>
    </Sheet>
  );
};

type QuickReminderFormProps = {
  dateStr: string;
  contacts: ContactLite[];
  onCancel: () => void;
  onCreated: () => void;
};

const QuickReminderForm = ({ dateStr, contacts, onCancel, onCreated }: QuickReminderFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReminderType>('generic');
  const [time, setTime] = useState('');
  const [notifyContactIds, setNotifyContactIds] = useState<string[]>(() => {
    const self = contacts.find((c) => c.is_self);
    return self ? [self.id] : [];
  });

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('title', title);
    fd.set('reminder_type', type);
    fd.set('reminder_date', dateStr);
    if (time) fd.set('reminder_time', time);
    fd.set('is_recurring', String(type === 'birthday'));
    fd.set('notify_days_before', '1');
    notifyContactIds.forEach((id) => fd.append('notify_contact_ids', id));

    startTransition(async () => {
      const result = await upsertReminder({ ok: false }, fd);
      if (result.ok) {
        toast.success('Recordatorio creado');
        track('reminder_created', { type });
        router.refresh();
        onCreated();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-xs px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 flex items-center gap-2">
        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
        <span>Se va a crear para <strong>{formatDateFull(dateStr)}</strong></span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TYPE_META) as Array<ReminderType>).map((key) => {
            const meta = TYPE_META[key];
            const Icon = meta.icon;
            const active = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                  active
                    ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Título</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === 'medical' ? 'Ej: Cardiólogo Dr. Pérez' :
            type === 'birthday' ? 'Ej: Cumpleaños de Lucía' :
            'Ej: Cambiar filtro del auto'
          }
          className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          autoFocus
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Hora <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
        />
      </div>

      {contacts.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">Avisar a</label>
          <div className="space-y-1.5">
            {contacts.map((c) => {
              const selected = notifyContactIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleContact(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                    selected
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 grid place-items-center transition-all shrink-0 ${
                      selected ? 'kumo-gradient border-transparent' : 'border-slate-300'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.phone ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">+{c.phone}</p>
                    ) : (
                      <p className="text-xs text-rose-400">Sin número</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Guardando...' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

type FullReminderSheetProps = {
  open: boolean;
  reminder: ReminderCal | null;
  contacts: ContactLite[];
  onClose: () => void;
};

const FullReminderSheet = ({ open, reminder, contacts, onClose }: FullReminderSheetProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ReminderType>('generic');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hasTime, setHasTime] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(1);
  const [notifyContactIds, setNotifyContactIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(reminder?.title ?? '');
    setDescription(reminder?.description ?? '');
    setType(reminder?.reminder_type ?? 'generic');
    setDate(dayKey(reminder?.reminder_date) || todayKey());
    setTime(reminder?.reminder_time?.slice(0, 5) ?? '');
    setHasTime(!!reminder?.reminder_time);
    setIsRecurring(reminder?.is_recurring ?? false);
    setNotifyDaysBefore(reminder?.notify_days_before ?? 1);
    if (!reminder) {
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
    } else {
      setNotifyContactIds(reminder.notify_contact_ids ?? []);
    }
  }, [open, reminder, contacts]);

  useEffect(() => {
    if (type === 'birthday' && !reminder) setIsRecurring(true);
  }, [type, reminder]);

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Solo al CREAR uno nuevo bloqueamos fechas pasadas. Editar uno existente con fecha pasada está bien.
    if (!reminder && date < todayKey()) {
      toast.error('No se pueden crear eventos en fechas pasadas.');
      return;
    }

    const fd = new FormData();
    if (reminder?.id) fd.set('id', reminder.id);
    fd.set('title', title);
    fd.set('description', description);
    fd.set('reminder_type', type);
    fd.set('reminder_date', date);
    if (hasTime && time) fd.set('reminder_time', time);
    fd.set('is_recurring', String(isRecurring));
    fd.set('notify_days_before', String(notifyDaysBefore));
    notifyContactIds.forEach((id) => fd.append('notify_contact_ids', id));

    startTransition(async () => {
      const result = await upsertReminder({ ok: false }, fd);
      if (result.ok) {
        toast.success(reminder ? 'Recordatorio actualizado' : 'Recordatorio creado');
        if (!reminder) {
          track('reminder_created', { type, contacts_count: notifyContactIds.length });
        }
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="full-reminder-form"
            disabled={pending || !title.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Guardando...' : reminder ? 'Guardar' : 'Crear'}
          </button>
        </div>
      }
    >
      <form id="full-reminder-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TYPE_META) as Array<ReminderType>).map((key) => {
              const meta = TYPE_META[key];
              const Icon = meta.icon;
              const active = type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                    active
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'medical' ? 'Ej: Cardiólogo Dr. Pérez' :
              type === 'birthday' ? 'Ej: Cumpleaños de Lucía' :
              'Ej: Cambiar filtro del auto'
            }
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            autoFocus
            required
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={!reminder ? todayKey() : undefined}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Hora <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setHasTime(!!e.target.value);
              }}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Notas <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Dirección, número de orden, lo que sea"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base resize-none"
            maxLength={500}
          />
        </div>

        <label className="flex items-center gap-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded text-sky-600 w-4 h-4"
          />
          <span className="font-medium">Se repite cada año</span>
          {type === 'birthday' && (
            <span className="ml-auto text-xs text-slate-400">recomendado</span>
          )}
        </label>

        <div>
          <label className="block text-sm font-medium mb-1.5">Avisar con anticipación</label>
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 3, 7, 15, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setNotifyDaysBefore(d)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  notifyDaysBefore === d
                    ? 'kumo-gradient text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {d === 0 ? 'Mismo día' : d === 1 ? '1 día antes' : `${d} días antes`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Avisar a</label>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              No tenés contactos. Agregalos en Configuración.
            </p>
          ) : (
            <div className="space-y-1.5">
              {contacts.map((c) => {
                const selected = notifyContactIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleContact(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                      selected
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 grid place-items-center transition-all ${
                      selected ? 'kumo-gradient border-transparent' : 'border-slate-300'
                    }`}>
                      {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.phone ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">+{c.phone}</p>
                      ) : (
                        <p className="text-xs text-rose-400">Sin número — no recibirá WhatsApp</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Sheet>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    {title && (
      <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {title}
      </h3>
    )}
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">{children}</div>
  </div>
);

type YearViewProps = {
  year: number;
  eventsByDate: Map<string, { expenses: ExpenseCal[]; reminders: ReminderCal[] }>;
  holidayIndex: Map<string, Holiday>;
  today: string;
  onMonthClick: (month: number) => void;
  onDayClick: (dateStr: string) => void;
};

const YearView = ({ year, eventsByDate, holidayIndex, today, onMonthClick, onDayClick }: YearViewProps) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold">{year}</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Tocá un mes para ver el detalle
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map((m) => (
          <MiniMonth
            key={m}
            year={year}
            month={m}
            eventsByDate={eventsByDate}
            holidayIndex={holidayIndex}
            today={today}
            onMonthClick={() => onMonthClick(m)}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
};

type MiniMonthProps = {
  year: number;
  month: number;
  eventsByDate: Map<string, { expenses: ExpenseCal[]; reminders: ReminderCal[] }>;
  holidayIndex: Map<string, Holiday>;
  today: string;
  onMonthClick: () => void;
  onDayClick: (dateStr: string) => void;
};

const MiniMonth = ({ year, month, eventsByDate, holidayIndex, today, onMonthClick, onDayClick }: MiniMonthProps) => {
  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long' });

  return (
    <div className="kumo-card p-3">
      <button
        type="button"
        onClick={onMonthClick}
        className="text-sm font-semibold capitalize mb-2 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
      >
        {monthLabel}
      </button>
      <div className="grid grid-cols-7 gap-0.5 text-[8px] text-slate-400 dark:text-slate-500 uppercase mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((cell) => {
          const isCurrentMonth = cell.month === month;
          const isToday = cell.dateStr === today;
          const events = eventsByDate.get(cell.dateStr);
          const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);
          const hasEvents = totalEvents > 0;
          const holiday = holidayIndex.get(cell.dateStr) ?? null;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onDayClick(cell.dateStr)}
              className={`relative aspect-square text-[9px] grid place-items-center rounded transition-colors ${
                !isCurrentMonth
                  ? 'text-slate-300 dark:text-slate-700'
                  : isToday
                    ? 'bg-sky-500 text-white font-bold'
                    : hasEvents
                      ? 'text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700'
                      : holiday
                        ? 'text-amber-700 dark:text-amber-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={holiday ? holiday.name : undefined}
            >
              {cell.day}
              {hasEvents && isCurrentMonth && !isToday && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500" />
              )}
              {holiday && isCurrentMonth && !isToday && !hasEvents && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};


const buildGrid = (year: number, month: number) => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const jsDay = firstOfMonth.getDay(); // 0=Dom..6=Sáb
  const firstDayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Lun..7=Dom
  const startOffset = firstDayOfWeek - 1;

  const cells: { day: number; month: number; year: number; dateStr: string }[] = [];

  for (let i = 0; i < 42; i++) {
    // Construimos cada celda con su offset desde el día 1 del mes — totalmente local, sin pasar por UTC.
    const d = new Date(year, month - 1, 1 - startOffset + i);
    cells.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    });
  }
  return cells;
};

const shiftMonth = (year: number, month: number, delta: number) => {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const parseLocalDate = (dateStr: string): Date | null => {
  const parts = dayKey(dateStr).split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatDateFull = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateLong = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

const daysBetween = (fromKey: string, toKey: string): number => {
  const from = parseLocalDate(fromKey);
  const to = parseLocalDate(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

const groupByMonth = (items: ReminderCal[]): Record<string, ReminderCal[]> => {
  const result: Record<string, ReminderCal[]> = {};
  for (const r of items) {
    const date = parseLocalDate(r.reminder_date);
    if (!date) continue;
    const key = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const titleCased = key.charAt(0).toUpperCase() + key.slice(1);
    (result[titleCased] ??= []).push(r);
  }
  return result;
};
