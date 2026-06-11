'use client';

import { useEffect, useState } from 'react';
import { Wallet, Calendar as CalendarIcon, Plus, Pencil, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName } from '@/lib/categoryLabels';
import type { Holiday } from '@/lib/holidays';
import type { ContactLite, DayEvents, ReminderCal } from './types';
import { TYPE_META, TONE_STYLES, COLOR_DOT } from './constants';
import { formatDateFull, localeTag, todayKey } from './utils';
import { Section } from './ui';
import { QuickReminderForm } from './QuickReminderForm';

type DayDetailSheetProps = {
  dateStr: string | null;
  events: DayEvents | null;
  contacts: ContactLite[];
  contactsById: Record<string, ContactLite>;
  defaultCurrency: Currency;
  holidayIndex: Map<string, Holiday>;
  hasWa: boolean;
  onClose: () => void;
  onEdit: (r: ReminderCal) => void;
  onDelete: (r: ReminderCal) => void;
};

export const DayDetailSheet = ({
  dateStr,
  events,
  contacts,
  defaultCurrency: _defaultCurrency,
  holidayIndex,
  hasWa,
  onClose,
  onEdit,
  onDelete,
}: DayDetailSheetProps) => {
  const { t, locale } = useT();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!dateStr) setCreating(false);
  }, [dateStr]);

  if (!dateStr) return null;

  const title = formatDateFull(dateStr, localeTag(locale));
  const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);
  const holiday = holidayIndex.get(dateStr) ?? null;
  const todayStr = todayKey();
  const isPast = dateStr < todayStr;

  if (creating) {
    return (
      <Sheet open={!!dateStr} onClose={onClose} title={t.calendar.new_reminder}>
        <QuickReminderForm
          dateStr={dateStr}
          contacts={contacts}
          hasWa={hasWa}
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
            <span className="font-medium">{t.calendar.holiday}</span>
            <span className="text-amber-600 dark:text-amber-300">— {holiday.name}</span>
          </div>
        )}

        {!isPast ? (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">{t.calendar.new_in_day}</span>
          </button>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2 italic">
            {t.calendar.no_past_create}
          </div>
        )}

        {totalEvents === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.calendar.no_events_day}</p>
          </div>
        ) : (
          <>
            {events && events.reminders.length > 0 && (
              <Section title={t.calendar.section_reminders}>
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
                          aria-label={t.common.edit}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(r)}
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-500"
                          aria-label={t.common.delete}
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
              <Section title={events.reminders.length > 0 ? t.calendar.section_expenses : ''}>
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
                          {e.description || (e.categories?.name ? categoryDisplayName(e.categories.name, t) : null) || t.expenses.default_name}
                          {isPending && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-peach-100 dark:bg-peach-500/20 text-peach-400 font-medium">
                              {t.expenses.pending}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {e.categories?.name ? categoryDisplayName(e.categories.name, t) : t.expenses.no_category}
                        </p>
                      </div>
                      <p className="font-semibold text-sm whitespace-nowrap">
                        {formatMoney(Number(e.amount), e.currency as Currency, locale)}
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
