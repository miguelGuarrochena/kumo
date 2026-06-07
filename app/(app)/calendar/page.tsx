import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from './CalendarClient';
import { type Currency } from '@/lib/currency';
import { countryFromTimezone } from '@/lib/holidays';
import { getCurrentWorkspace } from '@/lib/workspace';

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
  const ctx = await getCurrentWorkspace();
  const params = await searchParams;

  // Lista de workspaces del user (para el selector multi).
  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(*)')
    .eq('user_id', user?.id ?? '');

  type WsRow = { name: string; icon: string; color: string };
  const rawMemberships = (memberships ?? []) as unknown as { workspace_id: string; workspaces: WsRow | null }[];
  const workspaces = rawMemberships
    .filter((m) => m.workspaces !== null)
    .map((m) => ({
      id: m.workspace_id,
      name: m.workspaces!.name,
      icon: m.workspaces!.icon,
      color: m.workspaces!.color,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

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

  const userId = user?.id ?? '';

  // Calendar trae eventos de TODOS los workspaces del user (filtra RLS).
  // El cliente decide qué workspaces mostrar con checkboxes; default: solo el activo.
  const [
    { data: expenses },
    { data: reminders },
    { data: allReminders },
    { data: settings },
    { data: contacts },
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, workspace_id, description, amount, currency, due_date, expense_date, paid, categories(name, color)')
      .not('due_date', 'is', null)
      .gte('due_date', queryStart)
      .lte('due_date', queryEnd),
    supabase
      .from('reminders')
      .select('id, workspace_id, title, description, reminder_date, reminder_time, reminder_type, is_recurring, notify_days_before, notify_contact_ids')
      .gte('reminder_date', queryStart)
      .lte('reminder_date', queryEnd),
    supabase
      .from('reminders')
      .select('id, workspace_id, title, description, reminder_date, reminder_time, reminder_type, is_recurring, notify_days_before, notify_contact_ids')
      .order('reminder_date', { ascending: true }),
    supabase.from('user_settings').select('default_currency, timezone').eq('user_id', userId).maybeSingle(),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone')
      .eq('workspace_id', ctx.workspaceId)
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
      workspaces={workspaces}
      activeWorkspaceId={ctx.workspaceId}
    />
  );
};

export default CalendarPage;
