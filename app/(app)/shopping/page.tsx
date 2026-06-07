import { createClient } from '@/lib/supabase/server';
import { ShoppingClient } from './ShoppingClient';
import { getCurrentWorkspace } from '@/lib/workspace';

export default async function ShoppingPage() {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const { data: items } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('position', { ascending: true });

  return <ShoppingClient initialItems={items ?? []} />;
}
