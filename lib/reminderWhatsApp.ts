import type { Messages } from '@/lib/i18n/types';

type ReminderLike = {
  title: string;
  reminder_date: string;
  reminder_time?: string | null;
  reminder_type: 'medical' | 'birthday' | 'generic';
};

export const buildReminderWhatsAppText = (
  reminder: ReminderLike,
  recipientName: string | undefined,
  t: Messages,
): string => {
  const prefix =
    reminder.reminder_type === 'medical' ? t.reminders.wa_type_medical
    : reminder.reminder_type === 'birthday' ? t.reminders.wa_type_birthday
    : t.reminders.wa_type_generic;

  const datePart = reminder.reminder_time
    ? `${reminder.reminder_date} ${reminder.reminder_time.slice(0, 5)}`
    : reminder.reminder_date;

  const greeting = recipientName && recipientName !== 'Yo'
    ? t.reminders.wa_greeting_named.replace('{name}', recipientName)
    : '';

  return t.reminders.wa_body
    .replace('{greeting}', greeting)
    .replace('{prefix}', prefix)
    .replace('{title}', reminder.title)
    .replace('{date}', datePart);
};

export const openReminderWhatsApp = (
  reminder: ReminderLike,
  phone: string | undefined,
  recipientName: string | undefined,
  t: Messages,
): void => {
  const text = buildReminderWhatsAppText(reminder, recipientName, t);
  const encoded = encodeURIComponent(text);
  const digits = phone?.replace(/\D/g, '');
  const url = digits
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
