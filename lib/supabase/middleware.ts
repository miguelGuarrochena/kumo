// Helper de Supabase para Next.js middleware.
// Refresca tokens y propaga cookies. Llamado desde middleware.ts en raíz.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // refresca el token si está por expirar
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isPublic =
    url.pathname.startsWith('/auth') ||
    url.pathname === '/' ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/favicon');

  // Sin user + ruta privada → al login
  if (!user && !isPublic) {
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Con user + en /auth/login → al dashboard
  if (user && url.pathname === '/auth/login') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
