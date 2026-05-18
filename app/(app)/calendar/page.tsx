import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from './CalendarClient';
import { type Currency } from '@/lib/currency';
import { countryFromTimezone } from '@/lib/holidays';

type SearchParams = {
  month?: string;
  view?: 'month' | 'upcoming' | 'past';
};

// Construye una clave "YYYY-MM-DD" 100% local (sin pasar por UTC) — evita off-by-one en bordes de mes.
const localKey = (year: number, monthIdx: number, day: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const CalendarPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const supabase = await createClient();
  const params = await searchParams;

  const now = new Date();
  const fallbackMonth = localKey(now.getFullYear(), now.getMonth(), 1).slice(0, 7);
  const monthStr = params.month ?? fallbackMonth;
  const [yearStr, mStr] = monthStr.split('-');
  const year = Number(yearStr);
  const month = Number(mStr);

  // Rango ampliado para grid del mes (incluye días de mes anterior/siguiente que aparecen en la grilla 6x7).
  const queryStart = (() => {
    const d = new Date(year, month - 1, 1);
    d.setDate(d.getDate() - 7);
    return localKey(d.getFullYear(), d.getMonth(), d.getDate());
  })();
  const queryEnd = (() => {
    const d = new Date(year, month, 0); // último día del mes
    d.setDate(d.getDate() + 14);
    return localKey(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const startDate = localKey(year, month - 1, 1);
  const endDate = (() => {
    const d = new Date(year, month, 0);
    return localKey(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? '';

  const [
    { data: expenses },
    { data: reminders },
    { data: allReminders },
    { data: settings },
    { data: contacts },
  ] = await Promise.all([
    // En el calendario solo mostramos gastos que tienen fecha de vencimiento;
    // los gastos sin due_date no son eventos calendáricos.
    supabase
      .from('expenses')
      .select('id, description, amount, currency, due_date, expense_date, paid, categories(name, color)')
      .not('due_date', 'is', null)
      .gte('due_date', queryStart)
      .lte('due_date', queryEnd),
    supabase
      .from('reminders')
      .select('id, title, description, reminder_date, reminder_time, reminder_type, is_recurring, notify_days_before, notify_contact_ids')
      .gte('reminder_date', queryStart)
      .lte('reminder_date', queryEnd),
    supabase
      .from('reminders')
      .select('id, title, description, reminder_date, reminder_time, reminder_type, is_recurring, notify_days_before, notify_contact_ids')
      .order('reminder_date', { ascending: true }),
    supabase.from('user_settings').select('default_currency, timezone').eq('user_id', userId).maybeSingle(),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone')
      .order('created_at'),
  ]);

  const settingsTyped = settings as { default_currency?: string; timezone?: string } | null;
  const defaultCurrency = (settingsTyped?.default_currency ?? 'ARS') as Currency;
  const country = countryFromTimezone(settingsTyped?.timezone);

  const initialView = params.view ?? 'month';

  return (
    <CalendarClient
      year={year}
      month={month}
      startDate={startDate}
      endDate={endDate}
      expenses={(expenses ?? []) as never}
      reminders={(reminders ?? []) as never}
      allReminders={(allReminders ?? []) as never}
      contacts={(contacts ?? []) as never}
      defaultCurrency={defaultCurrency}
      initialView={initialView}
      country={country}
    />
  );
};

export default CalendarPage;
