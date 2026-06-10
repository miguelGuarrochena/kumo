import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';
import { getPricing } from '@/lib/pricing';
import { DividirClient } from './DividirClient';
import type { BalanceRow, ContactLite, PaymentRow } from './types';

const DividirPage = async () => {
  const supabase = await createClient();
  const ctx = await getCurrentWorkspace();
  const subscription = await getSubscription();

  const [{ data: contactsRaw }, balancesRes, { data: paymentsRaw }] = await Promise.all([
    supabase
      .from('notification_contacts')
      .select('id, name, is_self, user_id')
      .eq('workspace_id', ctx.workspaceId)
      .order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('workspace_balances', { ws_id: ctx.workspaceId }),
    supabase
      .from('payments')
      .select('id, from_contact_id, to_contact_id, amount, currency, note, paid_at')
      .eq('workspace_id', ctx.workspaceId)
      .order('paid_at', { ascending: false }),
  ]);

  type RawContact = { id: string; name: string; is_self: boolean; user_id: string | null };
  const contacts = ((contactsRaw ?? []) as RawContact[])
    .map((c) => ({ ...c, is_self: !!c.is_self && c.user_id === ctx.userId }))
    .sort((a, b) => {
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const balances = (balancesRes?.data ?? []) as BalanceRow[];
  const payments = (paymentsRaw ?? []) as PaymentRow[];

  const pricing = getPricing();

  return (
    <DividirClient
      contacts={contacts as ContactLite[]}
      balances={balances}
      payments={payments}
      hasOcrAccess={subscription.tier === 'pro'}
      trialDaysLeft={subscription.daysLeftInTrial}
      priceMonthly={pricing.monthly}
      priceYearly={pricing.yearly}
      yearlyPct={pricing.yearlyPct}
    />
  );
};

export default DividirPage;
