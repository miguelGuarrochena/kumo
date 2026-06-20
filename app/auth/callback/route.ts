// Callback de OAuth. Supabase redirige acá después del login con Google.

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { verifyGoogleCalendarState } from '@/lib/calendar/googleOAuth';

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const { searchParams, origin } = callbackUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const next = searchParams.get('next') ?? '/dashboard';

  // Si Google Calendar quedó configurado con /auth/callback como redirect URI,
  // llega acá con nuestro state firmado. Redirigimos al handler de Calendar antes
  // de que Supabase intente intercambiar un código que no le pertenece.
  if (state && verifyGoogleCalendarState(state)) {
    const googleCalendarCallback = new URL('/api/auth/google-calendar/callback', origin);
    googleCalendarCallback.search = callbackUrl.search;
    return NextResponse.redirect(googleCalendarCallback);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Logueamos para verlo en Vercel + le pasamos el mensaje al user via query
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    const detail = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed&detail=${detail}`);
  }

  // Verificación final: ¿la sesión quedó con un user válido?
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    console.error('[auth/callback] no user after exchange:', userErr?.message);
    return NextResponse.redirect(`${origin}/auth/login?error=no_user`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
