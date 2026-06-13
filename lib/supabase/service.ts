import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
};
