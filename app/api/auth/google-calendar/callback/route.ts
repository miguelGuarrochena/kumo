import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeGoogleCalendarCode,
  verifyGoogleCalendarState,
} from '@/lib/calendar/googleOAuth';
import {
  saveGoogleCalendarConnection,
  fullSyncToGoogle,
} from '@/lib/calendar/googleSync';
import { isGoogleCalendarOAuthConfigured } from '@/lib/calendar/googleConfigured';
import { after } from 'next/server';

const settingsUrl = (origin: string, status: 'connected' | 'error', message?: string) => {
  const url = new URL('/settings', origin);
  url.hash = 'google-calendar';
  url.searchParams.set('google_calendar', status);
  if (message) url.searchParams.set('google_calendar_error', message);
  return url;
};

export const GET = async (req: Request) => {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  if (!isGoogleCalendarOAuthConfigured()) {
    return NextResponse.redirect(settingsUrl(origin, 'error', 'not_configured'));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(settingsUrl(origin, 'error', oauthError));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !code || !state) {
    return NextResponse.redirect(settingsUrl(origin, 'error', 'unauthorized'));
  }

  const stateUserId = verifyGoogleCalendarState(state);
  if (!stateUserId || stateUserId !== user.id) {
    return NextResponse.redirect(settingsUrl(origin, 'error', 'invalid_state'));
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code, origin);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(settingsUrl(origin, 'error', 'no_refresh_token'));
    }
    await saveGoogleCalendarConnection(user.id, tokens.refresh_token);

    after(() => {
      void fullSyncToGoogle(user.id).catch((e) => {
        console.error('[google-calendar] initial sync', e);
      });
    });

    return NextResponse.redirect(settingsUrl(origin, 'connected'));
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.redirect(settingsUrl(origin, 'error', msg.slice(0, 120)));
  }
};
