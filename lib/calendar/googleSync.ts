import { createServiceClient } from '@/lib/supabase/service';
import { decryptToken, encryptToken } from './tokenCrypto';
import { refreshGoogleAccessToken } from './googleOAuth';
import {
  expenseDescription,
  expenseSummary,
  formatGoogleDateTime,
  kumoIcalUid,
  nextDateKey,
  reminderSummary,
} from './eventMeta';
import { isGoogleCalendarOAuthConfigured } from './googleConfigured';

const CALENDAR_ID = 'primary';
const PAST_DAYS = 30;
const FUTURE_DAYS = 365;

type GoogleEventBody = {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  iCalUID: string;
  extendedProperties?: { private?: Record<string, string> };
};

type ConnectionRow = {
  google_calendar_refresh_token: string | null;
  timezone: string;
};

const dateRange = () => {
  const start = new Date();
  start.setDate(start.getDate() - PAST_DAYS);
  const end = new Date();
  end.setDate(end.getDate() + FUTURE_DAYS);
  return { startKey: start.toISOString().slice(0, 10), endKey: end.toISOString().slice(0, 10) };
};

const getConnection = async (userId: string): Promise<ConnectionRow | null> => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('user_settings')
    .select('google_calendar_refresh_token, timezone')
    .eq('user_id', userId)
    .maybeSingle();
  const row = data as ConnectionRow | null;
  if (!row?.google_calendar_refresh_token) return null;
  return row;
};

const getAccessTokenForUser = async (userId: string): Promise<string | null> => {
  const conn = await getConnection(userId);
  if (!conn?.google_calendar_refresh_token) return null;
  // Si la TOKEN_KEY cambió o el dato está corrupto, decryptToken lanza
  // "Unsupported state or unable to authenticate data". No queremos que
  // eso rompa el disconnect (el user necesita poder limpiar el estado roto)
  // ni que cuelgue otras operaciones — devolvemos null y el caller decide.
  let refresh: string;
  try {
    refresh = decryptToken(conn.google_calendar_refresh_token);
  } catch {
    return null;
  }
  try {
    return await refreshGoogleAccessToken(refresh);
  } catch {
    return null;
  }
};

const googleFetch = async (
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const url = path.startsWith('http')
    ? path
    : `https://www.googleapis.com/calendar/v3${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
};

const markSyncResult = async (userId: string, error: string | null) => {
  const supabase = createServiceClient();
  const payload: Record<string, string | null> = {
    google_calendar_sync_error: error,
    updated_at: new Date().toISOString(),
  };
  if (!error) {
    payload.google_calendar_last_sync_at = new Date().toISOString();
  }
  await supabase.from('user_settings').update(payload as never).eq('user_id', userId);
};

const upsertMapping = async (
  userId: string,
  kumoType: 'reminder' | 'expense',
  kumoId: string,
  googleEventId: string,
) => {
  const supabase = createServiceClient();
  await supabase.from('google_calendar_events').upsert(
    {
      user_id: userId,
      kumo_type: kumoType,
      kumo_id: kumoId,
      google_event_id: googleEventId,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'user_id,kumo_type,kumo_id' },
  );
};

const deleteMapping = async (
  userId: string,
  kumoType: 'reminder' | 'expense',
  kumoId: string,
) => {
  const supabase = createServiceClient();
  await supabase
    .from('google_calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('kumo_type', kumoType)
    .eq('kumo_id', kumoId);
};

const getMapping = async (
  userId: string,
  kumoType: 'reminder' | 'expense',
  kumoId: string,
): Promise<string | null> => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('google_calendar_events')
    .select('google_event_id')
    .eq('user_id', userId)
    .eq('kumo_type', kumoType)
    .eq('kumo_id', kumoId)
    .maybeSingle();
  return (data as { google_event_id?: string } | null)?.google_event_id ?? null;
};

const findEventByIcalUid = async (
  accessToken: string,
  iCalUID: string,
): Promise<string | null> => {
  const params = new URLSearchParams({ iCalUID, maxResults: '1' });
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { items?: { id?: string }[] };
  return json.items?.[0]?.id ?? null;
};

const insertEvent = async (accessToken: string, body: GoogleEventBody): Promise<string> => {
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'No se pudo crear el evento en Google');
  }
  const json = (await res.json()) as { id: string };
  return json.id;
};

const updateEvent = async (
  accessToken: string,
  eventId: string,
  body: GoogleEventBody,
): Promise<string> => {
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  if (res.status === 404) return insertEvent(accessToken, body);
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'No se pudo actualizar el evento en Google');
  }
  const json = (await res.json()) as { id: string };
  return json.id;
};

const deleteGoogleEvent = async (accessToken: string, eventId: string): Promise<void> => {
  const res = await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  );
  if (res.status === 404 || res.status === 410) return;
  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'No se pudo borrar el evento en Google');
  }
};

const upsertGoogleEvent = async (
  userId: string,
  accessToken: string,
  kumoType: 'reminder' | 'expense',
  kumoId: string,
  body: GoogleEventBody,
): Promise<void> => {
  let eventId = await getMapping(userId, kumoType, kumoId);
  if (!eventId) {
    eventId = await findEventByIcalUid(accessToken, body.iCalUID);
  }
  const savedId = eventId
    ? await updateEvent(accessToken, eventId, body)
    : await insertEvent(accessToken, body);
  await upsertMapping(userId, kumoType, kumoId, savedId);
};

const buildReminderEvent = (
  rem: {
    id: string;
    title: string;
    description: string | null;
    reminder_date: string;
    reminder_time: string | null;
    reminder_type: string;
  },
  timeZone: string,
): GoogleEventBody => {
  const iCalUID = kumoIcalUid('reminder', rem.id);
  const summary = reminderSummary(rem.reminder_type, rem.title);
  const description = rem.description?.trim() || undefined;
  if (rem.reminder_time) {
    const { start, end } = formatGoogleDateTime(rem.reminder_date, rem.reminder_time, timeZone);
    return {
      summary,
      description,
      start,
      end,
      iCalUID,
      extendedProperties: { private: { kumoType: 'reminder', kumoId: rem.id } },
    };
  }
  return {
    summary,
    description,
    start: { date: rem.reminder_date },
    end: { date: nextDateKey(rem.reminder_date) },
    iCalUID,
    extendedProperties: { private: { kumoType: 'reminder', kumoId: rem.id } },
  };
};

const buildExpenseEvent = (
  exp: {
    id: string;
    description: string | null;
    due_date: string;
    amount: number;
    currency: string;
  },
): GoogleEventBody => {
  const iCalUID = kumoIcalUid('expense', exp.id);
  return {
    summary: expenseSummary(exp.description),
    description: expenseDescription(exp.amount, exp.currency),
    start: { date: exp.due_date },
    end: { date: nextDateKey(exp.due_date) },
    iCalUID,
    extendedProperties: { private: { kumoType: 'expense', kumoId: exp.id } },
  };
};

export const isGoogleCalendarConnected = async (userId: string): Promise<boolean> => {
  const conn = await getConnection(userId);
  return !!conn?.google_calendar_refresh_token;
};

export const saveGoogleCalendarConnection = async (
  userId: string,
  refreshToken: string,
): Promise<void> => {
  const supabase = createServiceClient();
  const encrypted = encryptToken(refreshToken);
  const { error } = await supabase
    .from('user_settings')
    .update({
      google_calendar_refresh_token: encrypted,
      google_calendar_connected_at: new Date().toISOString(),
      google_calendar_sync_error: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
};

export const syncReminderToGoogle = async (userId: string, reminderId: string): Promise<void> => {
  if (!isGoogleCalendarOAuthConfigured()) return;
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return;

  const supabase = createServiceClient();
  const { data: rem } = await supabase
    .from('reminders')
    .select('id, title, description, reminder_date, reminder_time, reminder_type, user_id')
    .eq('id', reminderId)
    .maybeSingle();

  if (!rem || (rem as { user_id: string }).user_id !== userId) return;

  const conn = await getConnection(userId);
  const timeZone = conn?.timezone ?? 'America/Argentina/Buenos_Aires';

  try {
    await upsertGoogleEvent(
      userId,
      accessToken,
      'reminder',
      reminderId,
      buildReminderEvent(rem as Parameters<typeof buildReminderEvent>[0], timeZone),
    );
    await markSyncResult(userId, null);
  } catch (e) {
    const msg = (e as Error).message;
    await markSyncResult(userId, msg);
    throw e;
  }
};

export const deleteReminderFromGoogle = async (userId: string, reminderId: string): Promise<void> => {
  if (!isGoogleCalendarOAuthConfigured()) return;
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return;

  const eventId = await getMapping(userId, 'reminder', reminderId);
  if (!eventId) return;

  try {
    await deleteGoogleEvent(accessToken, eventId);
    await deleteMapping(userId, 'reminder', reminderId);
    await markSyncResult(userId, null);
  } catch (e) {
    await markSyncResult(userId, (e as Error).message);
    throw e;
  }
};

export const syncExpenseToGoogle = async (userId: string, expenseId: string): Promise<void> => {
  if (!isGoogleCalendarOAuthConfigured()) return;
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return;

  const supabase = createServiceClient();
  const { data: exp } = await supabase
    .from('expenses')
    .select('id, description, due_date, amount, currency, paid, user_id')
    .eq('id', expenseId)
    .maybeSingle();

  if (!exp || (exp as { user_id: string }).user_id !== userId) return;

  const row = exp as {
    id: string;
    description: string | null;
    due_date: string | null;
    amount: number;
    currency: string;
    paid: boolean;
  };

  if (!row.due_date || row.paid) {
    await deleteExpenseFromGoogle(userId, expenseId);
    return;
  }

  try {
    await upsertGoogleEvent(
      userId,
      accessToken,
      'expense',
      expenseId,
      buildExpenseEvent({ ...row, due_date: row.due_date }),
    );
    await markSyncResult(userId, null);
  } catch (e) {
    await markSyncResult(userId, (e as Error).message);
    throw e;
  }
};

export const deleteExpenseFromGoogle = async (userId: string, expenseId: string): Promise<void> => {
  if (!isGoogleCalendarOAuthConfigured()) return;
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return;

  const eventId = await getMapping(userId, 'expense', expenseId);
  if (!eventId) return;

  try {
    await deleteGoogleEvent(accessToken, eventId);
    await deleteMapping(userId, 'expense', expenseId);
    await markSyncResult(userId, null);
  } catch (e) {
    await markSyncResult(userId, (e as Error).message);
    throw e;
  }
};

export const fullSyncToGoogle = async (userId: string): Promise<{ synced: number }> => {
  if (!isGoogleCalendarOAuthConfigured()) return { synced: 0 };
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return { synced: 0 };

  const { startKey, endKey } = dateRange();
  const supabase = createServiceClient();
  const conn = await getConnection(userId);
  const timeZone = conn?.timezone ?? 'America/Argentina/Buenos_Aires';

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

  let synced = 0;

  try {
    for (const rem of reminders ?? []) {
      await upsertGoogleEvent(
        userId,
        accessToken,
        'reminder',
        (rem as { id: string }).id,
        buildReminderEvent(rem as Parameters<typeof buildReminderEvent>[0], timeZone),
      );
      synced += 1;
    }
    for (const exp of expenses ?? []) {
      const row = exp as { id: string; due_date: string | null; paid: boolean };
      if (!row.due_date || row.paid) continue;
      await upsertGoogleEvent(
        userId,
        accessToken,
        'expense',
        row.id,
        buildExpenseEvent(exp as Parameters<typeof buildExpenseEvent>[0] & { due_date: string }),
      );
      synced += 1;
    }
    await markSyncResult(userId, null);
  } catch (e) {
    await markSyncResult(userId, (e as Error).message);
    throw e;
  }

  return { synced };
};

export const disconnectGoogleCalendar = async (userId: string): Promise<void> => {
  // El disconnect tiene que funcionar SIEMPRE, incluso si:
  //   - El refresh token está cifrado con una key vieja (descifrado falla).
  //   - El token fue revocado en Google y refresh ya no anda.
  //   - Google API está caída.
  // Por eso intentamos limpiar eventos remotos en best-effort, pero siempre
  // borramos el estado local al final.
  const supabase = createServiceClient();

  try {
    const accessToken = await getAccessTokenForUser(userId);
    if (accessToken) {
      const { data: mappings } = await supabase
        .from('google_calendar_events')
        .select('google_event_id')
        .eq('user_id', userId);

      for (const row of mappings ?? []) {
        const eventId = (row as { google_event_id: string }).google_event_id;
        try {
          await deleteGoogleEvent(accessToken, eventId);
        } catch {
          // Seguimos aunque falle un evento suelto.
        }
      }
    }
  } catch {
    // Cualquier error en la limpieza remota se ignora: lo importante es
    // dejar a Kumo desconectado, no rompernos por un side-effect.
  }

  await supabase.from('google_calendar_events').delete().eq('user_id', userId);
  await supabase
    .from('user_settings')
    .update({
      google_calendar_refresh_token: null,
      google_calendar_connected_at: null,
      google_calendar_last_sync_at: null,
      google_calendar_sync_error: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('user_id', userId);
};
