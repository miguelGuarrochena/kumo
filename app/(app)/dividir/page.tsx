import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';
import { DividirClient } from './DividirClient';
import type { ContactLite } from './types';

export default async function DividirPage() {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const subscription = await getSubscription();

  const { data: contactsRaw } = await supabase
    .from('notification_contacts')
    .select('id, name, is_self, user_id')
    .eq('workspace_id', ctx.workspaceId)
    .order('name');

  // Calculamos is_self desde la perspectiva del viewer (workspace compartido).
  type RawContact = { id: string; name: string; is_self: boolean; user_id: string | null };
  const contacts = ((contactsRaw ?? []) as RawContact[])
    .map((c) => ({ ...c, is_self: !!c.is_self && c.user_id === ctx.userId }))
    .sort((a, b) => {
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <DividirClient
      contacts={contacts as ContactLite[]}
      isPro={subscription.tier === 'pro'}
    />
  );
}
