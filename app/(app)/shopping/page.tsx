import { createClient } from '@/lib/supabase/server';
import { ShoppingClient } from './ShoppingClient';

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('shopping_items')
    .select('*')
    .order('position', { ascending: true });

  return <ShoppingClient initialItems={items ?? []} />;
}
