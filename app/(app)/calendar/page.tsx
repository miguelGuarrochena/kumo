import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from './CalendarClient';
import { type Currency } from '@/lib/currency';

type SearchParams = {
  month?: string; // YYYY-MM
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const monthStr = params.month ?? new Date().toISOString().slice(0, 7);
  const [yearStr, mStr] = monthStr.split('-');
  const year = Number(yearStr);
  const month = Number(mStr); // 1-12

  // Rango ampliado: para mostrar también los días del mes vecino que entran en el grid 6x7
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  // Para incluir días del grid (semana anterior y siguiente), tomamos un buffer de 7 días
  const queryStart = new Date(year, month - 1, -6).toISOString().slice(0, 10);
  const queryEnd = new Date(year, month, 7).toISOString().slice(0, 10);

  const [{ data: expenses }, { data: reminders }, { data: settings }] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, description, amount, currency, due_date, expense_date, paid, categories(name, color)')
      .or(`due_date.gte.${queryStart},expense_date.gte.${queryStart}`)
      .or(`due_date.lte.${queryEnd},expense_date.lte.${queryEnd}`),
    supabase
      .from('reminders')
      .select('id, title, reminder_date, reminder_time, reminder_type')
      .gte('reminder_date', queryStart)
      .lte('reminder_date', queryEnd),
    supabase.from('user_settings').select('default_currency').single(),
  ]);

  const defaultCurrency = (settings?.default_currency ?? 'ARS') as Currency;

  return (
    <CalendarClient
      year={year}
      month={month}
      startDate={startDate.toISOString().slice(0, 10)}
      endDate={endDate.toISOString().slice(0, 10)}
      expenses={expenses ?? []}
      reminders={reminders ?? []}
      defaultCurrency={defaultCurrency}
    />
  );
}
