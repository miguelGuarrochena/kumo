import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';
import { getPricing } from '@/lib/pricing';
import { DividirClient } from './DividirClient';
import type { ContactLite } from './types';

const DividirPage = async () => {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const subscription = await getSubscription();

  const { data: contactsRaw } = await supabase
    .from('notification_contacts')
    .select('id, name, is_self, user_id, is_split_only, phone, mp_alias, mp_payment_link')
    .eq('workspace_id', ctx.workspaceId)
    .order('name');

  type RawContact = {
    id: string;
    name: string;
    is_self: boolean;
    user_id: string | null;
    is_split_only: boolean;
  };
  const contacts = ((contactsRaw ?? []) as RawContact[])
    .map((c) => ({ ...c, is_self: !!c.is_self && c.user_id === ctx.userId }))
    .sort((a, b) => {
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      if (a.is_split_only !== b.is_split_only) return a.is_split_only ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

  const pricing = getPricing();

  return (
    <DividirClient
      contacts={contacts as ContactLite[]}
      hasOcrAccess={subscription.hasOcr}
      trialDaysLeft={subscription.daysLeftInTrial}
      pricing={pricing}
    />
  );
};

export default DividirPage;
