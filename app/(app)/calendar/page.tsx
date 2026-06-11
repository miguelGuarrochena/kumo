import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from './CalendarClient';
import { type Currency } from '@/lib/currency';
import { countryFromTimezone } from '@/lib/holidays';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';

type SearchParams = {
  month?: string;
  view?: 'month' | 'upcoming' | 'past';
};

const localKey = (year: number, monthIdx: number, day: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const CalendarPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const subscription = await getSubscription();
  const params = await searchParams;

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

  const queryStart = (() => {
    const d = new Date(year, month - 1, 1);
    d.setDate(d.getDate() - 7);
    return localKey(d.getFullYear(), d.getMonth(), d.getDate());
  })();
  const queryEnd = (() => {
    const d = new Date(year, month, 0);
    d.setDate(d.getDate() + 14);
    return localKey(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const startDate = localKey(year, month - 1, 1);
  const endDate = (() => {
    const d = new Date(year, month, 0);
    return localKey(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const userId = user?.id ?? '';

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
      .or(
        `and(due_date.gte.${queryStart},due_date.lte.${queryEnd}),` +
        `and(due_date.is.null,expense_date.gte.${queryStart},expense_date.lte.${queryEnd})`,
      ),
    supabase
      .from('reminders')
      .select('id, workspace_id, title, description, reminder_date, reminder_time, reminder_type, is_recurring, notify_days_before, notify_contact_ids')
      .gte('reminder_date', queryStart)
      .lte('reminder_date', queryEnd),
    supabase
      .from('reminders')
      .select('id, workspace_id, title, description, reminder_date, reminder_time, reminder_type, is_recurring, notify_days_before, notify_contact_ids')
      .order('reminder_date', { ascending: true }),
    supabase
      .from('user_settings')
      .select('default_currency, timezone, google_calendar_refresh_token')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('notification_contacts')
      .select('id, name, relationship, is_self, phone, user_id')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at'),
  ]);

  type RawCalContact = {
    id: string; name: string; relationship: string | null;
    is_self: boolean; phone: string | null; user_id: string | null;
  };
  const contactsForViewer = ((contacts ?? []) as RawCalContact[]).map((c) => ({
    ...c,
    is_self: !!c.is_self && c.user_id === ctx.userId,
  }));

  const settingsTyped = settings as {
    default_currency?: string;
    timezone?: string;
    google_calendar_refresh_token?: string | null;
  } | null;
  const defaultCurrency = (settingsTyped?.default_currency ?? 'ARS') as Currency;
  const country = countryFromTimezone(settingsTyped?.timezone);
  const googleCalendarConnected = !!settingsTyped?.google_calendar_refresh_token;

  const initialView = params.view ?? 'month';

  return (
    <CalendarClient
      googleCalendarConnected={googleCalendarConnected}
      year={year}
      month={month}
      startDate={startDate}
      endDate={endDate}
      expenses={(expenses ?? []) as never}
      reminders={(reminders ?? []) as never}
      allReminders={(allReminders ?? []) as never}
      contacts={contactsForViewer as never}
      defaultCurrency={defaultCurrency}
      initialView={initialView}
      country={country}
      workspaces={workspaces}
      activeWorkspaceId={ctx.workspaceId}
      hasWa={subscription.hasWa}
    />
  );
};

export default CalendarPage;
