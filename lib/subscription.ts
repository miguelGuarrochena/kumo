import { createClient } from '@/lib/supabase/server';

export type SubscriptionTier = 'pro' | 'free';

export type SubscriptionInfo = {
  tier: SubscriptionTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';
  trialEndsAt: Date | null;
  daysLeftInTrial: number | null;
  currentPeriodEnd: Date | null;
  providerSubscriptionId: string | null;
  isLifetime: boolean;
  isCourtesy: boolean;
};

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const emptyInfo: SubscriptionInfo = {
    tier: 'free', status: 'free',
    trialEndsAt: null, daysLeftInTrial: null, currentPeriodEnd: null,
    providerSubscriptionId: null, isLifetime: false, isCourtesy: false,
  };

  if (!user) return emptyInfo;

  const { data } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end, provider_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const row = data as {
    status: SubscriptionInfo['status'];
    trial_ends_at: string | null;
    current_period_end: string | null;
    provider_subscription_id: string | null;
  } | null;

  if (!row) return emptyInfo;

  const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;

  const now = new Date();
  const isTrialActive  = row.status === 'trialing' && trialEndsAt !== null && trialEndsAt > now;
  const isActive       = row.status === 'active';
  // Después de cancelar, mantenemos Pro hasta el fin del período pagado.
  const inGracePeriod  = row.status === 'canceled' && currentPeriodEnd !== null && currentPeriodEnd > now;

  const tier: SubscriptionTier = isTrialActive || isActive || inGracePeriod ? 'pro' : 'free';

  let daysLeftInTrial: number | null = null;
  if (isTrialActive && trialEndsAt) {
    daysLeftInTrial = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Lifetime: si la fecha está a más de 50 años de distancia (en la práctica,
  // 2099-12-31 que es lo que setea el admin para "Lifetime").
  const fiftyYears = 50 * 365 * 86400_000;
  const isLifetime = currentPeriodEnd !== null && currentPeriodEnd.getTime() - now.getTime() > fiftyYears;
  // Cortesía: active pero sin suscripción real en MP (regalo manual desde admin).
  const isCourtesy = row.status === 'active' && !row.provider_subscription_id;

  return {
    tier,
    status: row.status,
    trialEndsAt,
    daysLeftInTrial,
    currentPeriodEnd,
    providerSubscriptionId: row.provider_subscription_id,
    isLifetime,
    isCourtesy,
  };
};

/** Acceso a escanear tickets (suscripción activa o trial OCR). */
export const hasOcrAccess = (sub: SubscriptionInfo): boolean => sub.tier === 'pro';

export const requireOcrAccess = async () => {
  const sub = await getSubscription();
  if (!hasOcrAccess(sub)) {
    throw new Error('Escanear tickets requiere activar el complemento OCR.');
  }
  return sub;
};

/** @deprecated Usar requireOcrAccess */
export const requirePro = requireOcrAccess;
