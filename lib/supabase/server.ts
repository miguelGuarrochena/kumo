// Supabase client para uso en server (Server Components, Route Handlers, Server Actions).

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export type Client = SupabaseClient<Database>;

export async function createClient(): Promise<Client> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component; ignorá. El middleware se encarga.
          }
        },
      },
    },
  ) as unknown as Client;
}
