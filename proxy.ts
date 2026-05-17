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
    // Todas las rutas excepto archivos estáticos y rutas de API
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
