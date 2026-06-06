// Helper de Supabase para Next.js middleware.
// Refresca tokens y propaga cookies. Llamado desde middleware.ts en raíz.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

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
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isPublic =
    url.pathname.startsWith('/auth') ||
    url.pathname === '/' ||
    url.pathname.startsWith('/legal') ||
    url.pathname.startsWith('/accept-invite') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/favicon');

  if (!user && !isPublic) {
    url.pathname = '/auth/login';
    // Preservamos el destino original para que el callback pueda volver acá
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && url.pathname === '/auth/login') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
