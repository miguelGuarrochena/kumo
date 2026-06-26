'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Bell, Stethoscope, Cake, Calendar, Check, Users, MessageCircle,
} from 'lucide-react';
import { openReminderWhatsApp } from '@/lib/reminderWhatsApp';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { upsertReminder, deleteReminder } from './actions';
import { track } from '@/lib/analytics';
import { TYPE_LABEL_KEY } from '@/app/(app)/calendar/constants';
import { todayKey, daysBetween, parseLocalDate } from '@/lib/date';
import { useT } from '@/lib/i18n/client';
import { localeTag } from '@/lib/i18n/locale';

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: 'medical' | 'birthday' | 'generic';
  is_recurring: boolean;
  notify_days_before: number;
  notify_contact_ids: string[];
};

type Contact = {
  id: string;
  name: string;
  relationship: string;
  is_self: boolean;
  phone: string | null;
};

const TYPE_META = {
  medical:  { icon: Stethoscope, tone: 'rose'  },
  birthday: { icon: Cake,        tone: 'peach' },
  generic:  { icon: Bell,        tone: 'sky'   },
} as const;

const TONE_STYLES: Record<string, string> = {
  rose:     'bg-rose-100 text-rose-500 dark:bg-rose-500/20',
  peach:    'bg-peach-100 text-peach-400 dark:bg-peach-500/20',
  sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
  mint:     'bg-mint-100 text-mint-500 dark:bg-mint-500/20',
};

type Filter = 'upcoming' | 'past' | 'all';

type RemindersClientProps = {
  initialReminders: Reminder[];
  contacts: Contact[];
};

export const RemindersClient = ({ initialReminders, contacts }: RemindersClientProps) => {
  const router = useRouter();
  const { t, locale } = useT();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Reminder | null>(null);

  const today = todayKey();

  const filtered = useMemo(() => {
    if (filter === 'upcoming') return initialReminders.filter((r) => r.reminder_date >= today);
    if (filter === 'past')     return initialReminders.filter((r) => r.reminder_date < today).reverse();
    return initialReminders;
  }, [initialReminders, filter, today]);

  // Agrupar por mes para mostrar
  const grouped = useMemo(() => groupByMonth(filtered, localeTag(locale)), [filtered, locale]);

  const contactsById = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts],
  );

  const counts = {
    upcoming: initialReminders.filter((r) => r.reminder_date >= today).length,
    past:     initialReminders.filter((r) => r.reminder_date < today).length,
    all:      initialReminders.length,
  };

  const onDelete = async () => {
    if (!toDelete) return;
    const result = await deleteReminder(toDelete.id);
    if (result.ok) {
      toast.success(t.calendar.reminder_deleted);
      router.refresh();
    } else {
      toast.error(result.error ?? t.common.error);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.reminders.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {t.reminders.subtitle}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.common.new}</span>
        </button>
      </header>

      {/* Filtros */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <FilterTab active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>
          {t.reminders.tab_upcoming} · {counts.upcoming}
        </FilterTab>
        <FilterTab active={filter === 'past'} onClick={() => setFilter('past')}>
          {t.reminders.tab_past} · {counts.past}
        </FilterTab>
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
          {t.reminders.tab_all} · {counts.all}
        </FilterTab>
      </div>

      {filtered.length === 0 ? (
        <div className="kumo-card p-10 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="font-semibold mb-1">
            {filter === 'upcoming' ? t.reminders.empty_upcoming_title : filter === 'past' ? t.reminders.empty_past_title : t.reminders.empty_all_title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filter === 'upcoming' ? t.reminders.empty_upcoming_desc : t.reminders.empty_other_desc}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-2 px-1">
                {month}
              </h3>
              <div className="kumo-card divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
                {items.map((r) => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    contactsById={contactsById}
                    onEdit={() => setEditing(r)}
                    onDelete={() => setToDelete(r)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReminderSheet
        open={!!editing || creating}
        reminder={editing}
        contacts={contacts}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDelete}
        title={t.calendar.delete_title}
        description={t.calendar.delete_desc.replace('{title}', toDelete?.title ?? '')}
      />
    </div>
  );
};

type FilterTabProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const FilterTab = ({ active, onClick, children }: FilterTabProps) => {
  return (
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
};

type ReminderRowProps = {
  reminder: Reminder;
  contactsById: Record<string, Contact>;
  onEdit: () => void;
  onDelete: () => void;
};

const ReminderRow = ({ reminder, contactsById, onEdit, onDelete }: ReminderRowProps) => {
  const { t, locale } = useT();
  const meta = TYPE_META[reminder.reminder_type];
  const Icon = meta.icon;
  const toneCls = TONE_STYLES[meta.tone] ?? TONE_STYLES.sky;

  const today = todayKey();
  const diffDays = daysBetween(today, reminder.reminder_date);

  const diffLabel =
    diffDays === 0  ? t.calendar.rel_today :
    diffDays === 1  ? t.calendar.rel_tomorrow :
    diffDays > 0    ? t.calendar.rel_in_days.replace('{n}', String(diffDays)) :
    diffDays === -1 ? t.calendar.rel_yesterday :
                      t.calendar.rel_days_ago.replace('{n}', String(Math.abs(diffDays)));

  const notifyContactNames = reminder.notify_contact_ids
    .map((id) => contactsById[id]?.name)
    .filter(Boolean) as string[];

  const waContact = reminder.notify_contact_ids
    .map((id) => contactsById[id])
    .find((c) => c?.phone);

  const onManualWhatsApp = () => {
    if (!waContact?.phone) return;
    openReminderWhatsApp(reminder, waContact.phone, waContact.name, t);
  };

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
          {formatDate(reminder.reminder_date, localeTag(locale))}
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
        {waContact?.phone && (
          <button
            type="button"
            onClick={onManualWhatsApp}
            title={t.reminders.wa_manual}
            className="p-2 rounded-lg hover:bg-mint-100 dark:hover:bg-mint-900/20 text-mint-600 dark:text-mint-400"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
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

type ReminderSheetProps = {
  open: boolean;
  reminder: Reminder | null;
  contacts: Contact[];
  onClose: () => void;
};

const ReminderSheet = ({ open, reminder, contacts, onClose }: ReminderSheetProps) => {
  const router = useRouter();
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'medical' | 'birthday' | 'generic'>('generic');
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
    setDate(reminder?.reminder_date ?? todayKey());
    setTime(reminder?.reminder_time?.slice(0, 5) ?? '');
    setHasTime(!!reminder?.reminder_time);
    setIsRecurring(reminder?.is_recurring ?? false);
    setNotifyDaysBefore(reminder?.notify_days_before ?? 1);
    // Por default, marcar "Yo" si es creación nueva
    if (!reminder) {
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
    } else {
      setNotifyContactIds(reminder.notify_contact_ids ?? []);
    }
    // Re-sincronizamos el form solo al abrir o al cambiar de recordatorio (por id),
    // no en cada cambio de campo del objeto `reminder`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reminder?.id, contacts]);

  // Si elige cumpleaños, sugerir recurrencia anual
  useEffect(() => {
    if (type === 'birthday' && !reminder) {
      setIsRecurring(true);
    }
  }, [type, reminder]);

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        toast.success(reminder ? t.calendar.reminder_updated : t.calendar.reminder_created);
        if (!reminder) {
          track('reminder_created', { type, contacts_count: notifyContactIds.length });
        }
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reminder ? t.calendar.edit_reminder : t.calendar.new_reminder}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="reminder-form"
            disabled={pending || !title.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.common.saving : reminder ? t.common.save : t.calendar.create}
          </button>
        </div>
      }
    >
      <form id="reminder-form" onSubmit={onSubmit} className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.calendar.type_label}</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((key) => {
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
                  <span className="text-xs font-medium">{t.calendar[TYPE_LABEL_KEY[key]]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.calendar.title_label}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'medical' ? t.calendar.placeholder_medical :
              type === 'birthday' ? t.calendar.placeholder_birthday :
              t.calendar.placeholder_generic
            }
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            autoFocus
            required
            maxLength={100}
          />
        </div>

        {/* Fecha + hora opcional */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.calendar.date_label}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t.calendar.time_label} <span className="text-slate-400 font-normal">({t.common.optional})</span>
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

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t.calendar.notes_label} <span className="text-slate-400 font-normal">({t.common.optional})</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t.calendar.notes_placeholder}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base resize-none"
            maxLength={500}
          />
        </div>

        {/* Recurrencia */}
        <label className="flex items-center gap-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded text-sky-600 w-4 h-4"
          />
          <span className="font-medium">{t.calendar.recurring_yearly}</span>
          {type === 'birthday' && (
            <span className="ml-auto text-xs text-slate-400">{t.calendar.recurring_recommended}</span>
          )}
        </label>

        {/* Días antes */}
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.calendar.notify_before}</label>
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
                {d === 0
                  ? t.calendar.notify_same_day
                  : d === 1
                    ? t.calendar.notify_one_day
                    : t.calendar.notify_n_days.replace('{n}', String(d))}
              </button>
            ))}
          </div>
        </div>

        {/* A quién avisar */}
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.calendar.notify_to}</label>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              {t.calendar.no_contacts}
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
                        <p className="text-xs text-rose-400">{t.calendar.no_phone_wa}</p>
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

function groupByMonth(reminders: Reminder[], locale: string): Record<string, Reminder[]> {
  const result: Record<string, Reminder[]> = {};
  for (const r of reminders) {
    const d = parseLocalDate(r.reminder_date);
    if (!d) continue;
    const key = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const titleCased = key.charAt(0).toUpperCase() + key.slice(1);
    (result[titleCased] ??= []).push(r);
  }
  return result;
}

function formatDate(dateStr: string, locale: string): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}
