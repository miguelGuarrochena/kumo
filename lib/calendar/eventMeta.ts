// Metadatos compartidos entre feed ICS y sync Google Calendar API.

export const KUMO_CALENDAR_DOMAIN = 'kumo-app.com';

export const kumoIcalUid = (type: 'reminder' | 'expense', id: string): string =>
  `kumo-${type}-${id}@${KUMO_CALENDAR_DOMAIN}`;

export const reminderSummary = (type: string, title: string): string => {
  const prefix =
    type === 'medical' ? 'Turno médico' : type === 'birthday' ? 'Cumpleaños' : 'Recordatorio';
  return `${prefix}: ${title}`;
};

export const expenseSummary = (description: string | null): string =>
  `Vence: ${description?.trim() || 'Gasto'}`;

export const expenseDescription = (amount: number, currency: string): string =>
  `${amount} ${currency}`;

/** Fin exclusivo para eventos de día completo en Google Calendar. */
export const nextDateKey = (dateKey: string): string => {
  const [yStr, mStr, dStr] = dateKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
};

export const formatGoogleDateTime = (dateKey: string, time: string, timeZone: string) => {
  const [h = '00', min = '00'] = time.split(':');
  const hh = h.padStart(2, '0');
  const mm = min.padStart(2, '0');
  const endHour = String((Number(hh) + 1) % 24).padStart(2, '0');
  return {
    start: { dateTime: `${dateKey}T${hh}:${mm}:00`, timeZone },
    end: { dateTime: `${dateKey}T${endHour}:${mm}:00`, timeZone },
  };
};
