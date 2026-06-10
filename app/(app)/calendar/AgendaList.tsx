'use client';

import { useMemo } from 'react';
import { Bell, Pencil, Trash2, Users } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import type { ContactLite, ReminderCal } from './types';
import { TYPE_META, TONE_STYLES } from './constants';
import { dayKey, daysBetween, formatDateLong, groupByMonth, localeTag } from './utils';

type AgendaListProps = {
  items: ReminderCal[];
  contactsById: Record<string, ContactLite>;
  today: string;
  onEdit: (r: ReminderCal) => void;
  onDelete: (r: ReminderCal) => void;
  emptyMessage: string;
};

export const AgendaList = ({ items, contactsById, today, onEdit, onDelete, emptyMessage }: AgendaListProps) => {
  const { locale } = useT();
  const grouped = useMemo(() => groupByMonth(items, localeTag(locale)), [items, locale]);

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

type AgendaRowProps = {
  reminder: ReminderCal;
  contactsById: Record<string, ContactLite>;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
};

const AgendaRow = ({ reminder, contactsById, today, onEdit, onDelete }: AgendaRowProps) => {
  const { t, locale } = useT();
  const meta = TYPE_META[reminder.reminder_type];
  const Icon = meta.icon;
  const toneCls = TONE_STYLES[meta.tone];

  const reminderKey = dayKey(reminder.reminder_date);
  const diffDays = daysBetween(today, reminderKey);

  const diffLabel =
    diffDays === 0  ? t.calendar.rel_today :
    diffDays === 1  ? t.calendar.rel_tomorrow :
    diffDays > 0    ? t.calendar.rel_in_days.replace('{n}', String(diffDays)) :
    diffDays === -1 ? t.calendar.rel_yesterday :
                      t.calendar.rel_days_ago.replace('{n}', String(Math.abs(diffDays)));

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
              {t.calendar.annual_badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          {formatDateLong(reminder.reminder_date, localeTag(locale))}
          {reminder.reminder_time && ` · ${reminder.reminder_time.slice(0, 5)}`}
          {' · '}
          <span className={diffDays === 0 ? 'text-rose-500 font-medium' : ''}>{diffLabel}</span>
        </p>
        {notifyContactNames.length > 0 && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate flex items-center gap-1">
            <Users className="w-3 h-3" />
            {t.calendar.notify_to}: {notifyContactNames.join(', ')}
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
