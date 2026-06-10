import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCalendarFeedToken } from '@/lib/calendar/feedToken';
import { buildIcsCalendar } from '@/lib/calendar/ics';
import type { Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

const pastDays = 30;
const futureDays = 365;

export const GET = async (req: Request) => {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
  }

  const parsed = verifyCalendarFeedToken(token);
  if (!parsed) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('calendar_feed_version')
    .eq('user_id', parsed.userId)
    .maybeSingle();

  const currentVersion =
    (settingsRow as { calendar_feed_version?: number } | null)?.calendar_feed_version ?? 0;

  if (parsed.version !== currentVersion) {
    return NextResponse.json({ error: 'Token revocado' }, { status: 401 });
  }

  const userId = parsed.userId;

  const start = new Date();
  start.setDate(start.getDate() - pastDays);
  const end = new Date();
  end.setDate(end.getDate() + futureDays);

  const startKey = start.toISOString().slice(0, 10);
  const endKey = end.toISOString().slice(0, 10);

  const [{ data: reminders }, { data: expenses }] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, title, description, reminder_date, reminder_time, reminder_type')
      .eq('user_id', userId)
      .gte('reminder_date', startKey)
      .lte('reminder_date', endKey),
    supabase
      .from('expenses')
      .select('id, description, due_date, amount, currency, paid')
      .eq('user_id', userId)
      .not('due_date', 'is', null)
      .eq('paid', false)
      .gte('due_date', startKey)
      .lte('due_date', endKey),
  ]);

  const dueExpenses = (expenses ?? []).filter(
    (e): e is typeof e & { due_date: string } => e.due_date !== null,
  );
  const ics = buildIcsCalendar(reminders ?? [], dueExpenses);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="kumo.ics"',
      'Cache-Control': 'private, no-cache, max-age=300',
    },
  });
};
