import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_SECRET_KEY required');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
};
