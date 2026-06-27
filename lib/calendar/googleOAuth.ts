import { createHmac, timingSafeEqual } from 'crypto';
import { googleCalendarRedirectUri } from './googleConfigured';

const oauthSecret = () =>
  process.env.GOOGLE_CALENDAR_TOKEN_KEY
  ?? process.env.CRON_SECRET
  ?? process.env.SUPABASE_SECRET_KEY
  ?? '';

const signStatePayload = (userId: string): string =>
  createHmac('sha256', oauthSecret()).update(`gcal:${userId}`).digest('base64url');

export const signGoogleCalendarState = (userId: string): string =>
  `${userId}.${signStatePayload(userId)}`;

export const verifyGoogleCalendarState = (state: string): string | null => {
  const [userId, sig] = state.split('.');
  if (!userId || !sig) return null;
  const expected = signStatePayload(userId);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
};

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const buildGoogleCalendarAuthUrl = (userId: string, origin: string): string => {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
  const redirectUri = googleCalendarRedirectUri(origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: signGoogleCalendarState(userId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
};

export const exchangeGoogleCalendarCode = async (
  code: string,
  origin: string,
): Promise<GoogleTokenResponse> => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri: googleCalendarRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!res.ok) {
    throw new Error(data.error_description ?? data.error ?? 'Error al autorizar Google Calendar');
  }
  return data;
};

export const refreshGoogleAccessToken = async (refreshToken: string): Promise<string> => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'No se pudo renovar el token de Google');
  }
  return data.access_token;
};

export const revokeGoogleToken = async (token: string): Promise<void> => {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};
