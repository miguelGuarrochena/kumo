import { createClient } from '@/lib/supabase/server';

export type SubscriptionTier = 'pro' | 'free';

export type SubscriptionInfo = {
  tier: SubscriptionTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';
  trialEndsAt: Date | null;
  daysLeftInTrial: number | null;
  currentPeriodEnd: Date | null;
};

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      tier: 'free', status: 'free',
      trialEndsAt: null, daysLeftInTrial: null, currentPeriodEnd: null,
    };
  }

  const { data } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const row = data as {
    status: SubscriptionInfo['status'];
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;

  if (!row) {
    return {
      tier: 'free', status: 'free',
      trialEndsAt: null, daysLeftInTrial: null, currentPeriodEnd: null,
    };
  }

  const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;

  const now = new Date();
  const isTrialActive =
    row.status === 'trialing' && trialEndsAt !== null && trialEndsAt > now;
  const isActive = row.status === 'active';

  const tier: SubscriptionTier = isTrialActive || isActive ? 'pro' : 'free';

  let daysLeftInTrial: number | null = null;
  if (isTrialActive && trialEndsAt) {
    daysLeftInTrial = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    tier,
    status: row.status,
    trialEndsAt,
    daysLeftInTrial,
    currentPeriodEnd,
  };
};

export const requirePro = async () => {
  const sub = await getSubscription();
  if (sub.tier !== 'pro') {
    throw new Error('Esta función requiere Pro. Suscribite para acceder.');
  }
  return sub;
};
