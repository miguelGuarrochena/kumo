// Next.js 16 renombró el convention "middleware" → "proxy".
// Mantenemos la lógica de Supabase auth en lib/supabase/middleware.ts (es solo
// el archivo en raíz el que cambió de nombre).

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml|icons/|apple-touch-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)',
  ],
};
