// Callback de OAuth. Supabase redirige acá después del login con Google.

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

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
