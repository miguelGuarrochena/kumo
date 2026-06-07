import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';
import { CompartirClient } from './CompartirClient';
import type { ContactLite } from './types';

export default async function CompartirPage() {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const subscription = await getSubscription();

  const { data: contactsRaw } = await supabase
    .from('notification_contacts')
    .select('id, name, is_self')
    .eq('workspace_id', ctx.workspaceId)
    .order('is_self', { ascending: false })
    .order('name');

  return (
    <CompartirClient
      contacts={(contactsRaw ?? []) as ContactLite[]}
      isPro={subscription.tier === 'pro'}
    />
  );
}
