// Supabase client para uso en el browser (Client Components).

import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type BrowserClient = SupabaseClient<Database>;

export function createClient(): BrowserClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as BrowserClient;
}
