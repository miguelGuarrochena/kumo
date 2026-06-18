import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { buildGoogleCalendarAuthUrl } from '@/lib/calendar/googleOAuth';
import { isGoogleCalendarOAuthConfigured } from '@/lib/calendar/googleConfigured';

export const GET = async () => {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  if (!isGoogleCalendarOAuthConfigured()) {
    return NextResponse.json({ error: 'Google Calendar no configurado' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set('next', '/api/auth/google-calendar');
    return NextResponse.redirect(loginUrl);
  }

  const url = buildGoogleCalendarAuthUrl(user.id, origin);
  return NextResponse.redirect(url);
};
