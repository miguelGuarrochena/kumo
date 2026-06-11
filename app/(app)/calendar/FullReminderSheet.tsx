'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, MessageCircle } from 'lucide-react';
import { openReminderWhatsApp } from '@/lib/reminderWhatsApp';
import { Sheet } from '@/components/Sheet';
import { upsertReminder } from '@/app/(app)/reminders/actions';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';
import type { ContactLite, ReminderCal, ReminderType } from './types';
import { TYPE_META, TYPE_LABEL_KEY } from './constants';
import { dayKey, todayKey } from './utils';
import { toggleNotifyContactId } from '@/lib/notifyContacts';
import { WA_MAX_RECIPIENTS } from '@/lib/notifications/waLimitsClient';

type FullReminderSheetProps = {
  open: boolean;
  reminder: ReminderCal | null;
  contacts: ContactLite[];
  hasWa: boolean;
  onClose: () => void;
};

export const FullReminderSheet = ({ open, reminder, contacts, hasWa, onClose }: FullReminderSheetProps) => {
  const router = useRouter();
  const { t } = useT();
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
      toggleNotifyContactId(prev, id, {
        enforceMax: hasWa,
        max: WA_MAX_RECIPIENTS,
        onBlocked: () =>
          toast.info(
            t.calendar.wa_contacts_limit_toast.replace('{max}', String(WA_MAX_RECIPIENTS)),
          ),
      }),
    );
  };

  const waContact = reminder
    ? notifyContactIds
        .map((id) => contacts.find((c) => c.id === id))
        .find((c) => c?.phone)
    : null;

  const onManualWhatsApp = () => {
    if (!reminder || !waContact?.phone) return;
    openReminderWhatsApp(reminder, waContact.phone, waContact.name, t);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Solo al CREAR uno nuevo bloqueamos fechas pasadas. Editar uno existente con fecha pasada está bien.
    if (!reminder && date < todayKey()) {
      toast.error(t.calendar.no_past_dates);
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
          {reminder && waContact?.phone && (
            <button
              type="button"
              onClick={onManualWhatsApp}
              title={t.reminders.wa_manual}
              className="px-4 py-3 rounded-xl text-sm font-medium text-mint-700 dark:text-mint-300 bg-mint-100 dark:bg-mint-900/30 hover:bg-mint-200 dark:hover:bg-mint-900/50"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="full-reminder-form"
            disabled={pending || !title.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.common.saving : reminder ? t.common.save : t.calendar.create}
          </button>
        </div>
      }
    >
      <form id="full-reminder-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.calendar.type_label}</label>
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
                  <span className="text-xs font-medium">{t.calendar[TYPE_LABEL_KEY[key]]}</span>
                </button>
              );
            })}
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.calendar.date_label}</label>
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
          {hasWa && contacts.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t.calendar.wa_contacts_limit_hint.replace('{max}', String(WA_MAX_RECIPIENTS))}
            </p>
          )}
          {!hasWa && notifyContactIds.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              {t.calendar.wa_auto_note}{' '}
              <a href="/settings#plans" className="underline font-medium">
                {t.settings.contacts_wa_upsell_cta}
              </a>
            </p>
          )}
        </div>
      </form>
    </Sheet>
  );
};
