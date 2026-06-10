type IcsReminder = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: string;
};

type IcsExpense = {
  id: string;
  description: string | null;
  due_date: string;
  amount: number;
  currency: string;
  paid: boolean;
};

const escapeIcs = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

const formatIcsDate = (date: string): string => date.replace(/-/g, '');

const formatIcsDateTime = (date: string, time: string): string => {
  const [h = '00', m = '00'] = time.split(':');
  return `${formatIcsDate(date)}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
};

const reminderPrefix = (type: string): string => {
  if (type === 'medical') return 'Turno médico';
  if (type === 'birthday') return 'Cumpleaños';
  return 'Recordatorio';
};

export const buildIcsCalendar = (
  reminders: IcsReminder[],
  expenses: IcsExpense[],
): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kumo//Calendar Feed//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Kumo',
  ];

  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  for (const rem of reminders) {
    const summary = `${reminderPrefix(rem.reminder_type)}: ${rem.title}`;
    const desc = rem.description?.trim() ?? '';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:kumo-reminder-${rem.id}@kumo-app.com`);
    lines.push(`DTSTAMP:${now}`);
    if (rem.reminder_time) {
      lines.push(`DTSTART:${formatIcsDateTime(rem.reminder_date, rem.reminder_time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(rem.reminder_date)}`);
    }
    lines.push(`SUMMARY:${escapeIcs(summary)}`);
    if (desc) lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
    lines.push('END:VEVENT');
  }

  for (const exp of expenses) {
    if (!exp.due_date || exp.paid) continue;
    const summary = `Vence: ${exp.description ?? 'Gasto'}`;
    const desc = `${exp.amount} ${exp.currency}`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:kumo-expense-${exp.id}@kumo-app.com`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(exp.due_date)}`);
    lines.push(`SUMMARY:${escapeIcs(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
};
