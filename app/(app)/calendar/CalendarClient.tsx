'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Check } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Currency } from '@/lib/currency';
import { deleteReminder } from '@/app/(app)/reminders/actions';
import { buildHolidayIndex, type Country, type Holiday } from '@/lib/holidays';
import { useT } from '@/lib/i18n/client';
import type {
  ContactLite,
  ExpenseCal,
  ReminderCal,
  ViewMode,
  WorkspaceLite,
} from './types';
import { WS_VISIBILITY_KEY, WS_COLOR_DOT } from './constants';
import { dayKey, todayKey, shiftMonth } from './utils';
import { TabButton } from './ui';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { AgendaList } from './AgendaList';
import { DayDetailSheet } from './DayDetailSheet';
import { FullReminderSheet } from './FullReminderSheet';
import { CalendarFeedBanner } from '@/components/CalendarFeedBanner';

export type { WorkspaceLite } from './types';

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
  feedUrl: string;
  hasWa: boolean;
};

type WithWorkspace<T> = T & { workspace_id: string };

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
  feedUrl,
  hasWa,
}: Props) => {
  const router = useRouter();
  const { t } = useT();

  const [visibleWs, setVisibleWs] = useState<Set<string>>(() => new Set([activeWorkspaceId]));
  const [view, setView] = useState<ViewMode>(initialView);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<ReminderCal | null>(null);
  const [toDelete, setToDelete] = useState<ReminderCal | null>(null);

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
    () => expensesRaw.filter((e) => visibleWs.has((e as WithWorkspace<ExpenseCal>).workspace_id)),
    [expensesRaw, visibleWs],
  );
  const reminders = useMemo(
    () => remindersRaw.filter((r) => visibleWs.has((r as WithWorkspace<ReminderCal>).workspace_id)),
    [remindersRaw, visibleWs],
  );
  const allReminders = useMemo(
    () => allRemindersRaw.filter((r) => visibleWs.has((r as WithWorkspace<ReminderCal>).workspace_id)),
    [allRemindersRaw, visibleWs],
  );

  const holidayIndex = useMemo<Map<string, Holiday>>(() => buildHolidayIndex(country), [country]);

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

  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) : null;

  const onDeleteConfirm = async () => {
    if (!toDelete) return;
    const result = await deleteReminder(toDelete.id);
    if (result.ok) {
      toast.success(t.calendar.reminder_deleted);
      router.refresh();
    } else {
      toast.error(result.error ?? t.common.error);
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

      <CalendarFeedBanner feedUrl={feedUrl} />

      {workspaces.length > 1 && (
        <div className="kumo-card p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">{t.calendar.show_label}</span>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
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
        <MonthView
          year={year}
          month={month}
          eventsByDate={eventsByDate}
          holidayIndex={holidayIndex}
          today={today}
          country={country}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          onDayClick={setSelectedDay}
        />
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
          emptyMessage={view === 'upcoming' ? t.calendar.no_upcoming : t.calendar.no_past}
        />
      )}

      <DayDetailSheet
        dateStr={selectedDay}
        events={selectedEvents ?? null}
        contacts={contacts}
        contactsById={contactsById}
        defaultCurrency={defaultCurrency}
        holidayIndex={holidayIndex}
        hasWa={hasWa}
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
        hasWa={hasWa}
        onClose={() => setEditingReminder(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDeleteConfirm}
        title={t.calendar.delete_title}
        description={t.calendar.delete_desc.replace('{title}', toDelete?.title ?? '')}
      />
    </div>
  );
};
