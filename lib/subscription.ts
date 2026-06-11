import { createClient } from '@/lib/supabase/server';
import {
  isYearlyPlanVariant,
  planIncludesOcr,
  planIncludesWa,
  type PlanProduct,
} from '@/lib/plans';

export type SubscriptionTier = 'pro' | 'free';

export type SubscriptionInfo = {
  tier: SubscriptionTier;
  planType: PlanProduct | null;
  hasOcr: boolean;
  hasWa: boolean;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';
  trialEndsAt: Date | null;
  daysLeftInTrial: number | null;
  currentPeriodEnd: Date | null;
  providerSubscriptionId: string | null;
  isLifetime: boolean;
  isCourtesy: boolean;
  isYearly: boolean;
};

const hasPaidAccess = (
  status: SubscriptionInfo['status'],
  trialEndsAt: Date | null,
  currentPeriodEnd: Date | null,
): boolean => {
  const now = Date.now();
  const isTrialActive = status === 'trialing' && trialEndsAt !== null && trialEndsAt.getTime() > now;
  const isActive = status === 'active';
  const inGracePeriod =
    status === 'canceled' && currentPeriodEnd !== null && currentPeriodEnd.getTime() > now;
  return isTrialActive || isActive || inGracePeriod;
};

const resolvePlanType = (
  raw: string | null,
  hasAccess: boolean,
  providerSubscriptionId: string | null,
  status: SubscriptionInfo['status'],
): PlanProduct | null => {
  if (!hasAccess) return null;
  if (raw === 'ocr' || raw === 'wa' || raw === 'bundle') return raw;
  // Retrocompat: MP activo sin tipo → OCR; cortesía/trial sin MP → bundle
  if (providerSubscriptionId) return 'ocr';
  if (status === 'trialing' || status === 'active') return 'bundle';
  return null;
};

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const emptyInfo: SubscriptionInfo = {
    tier: 'free',
    planType: null,
    hasOcr: false,
    hasWa: false,
    status: 'free',
    trialEndsAt: null,
    daysLeftInTrial: null,
    currentPeriodEnd: null,
    providerSubscriptionId: null,
    isLifetime: false,
    isCourtesy: false,
    isYearly: false,
  };

  if (!user) return emptyInfo;

  const { data } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end, provider_subscription_id, plan_type, provider_variant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const row = data as {
    status: SubscriptionInfo['status'];
    trial_ends_at: string | null;
    current_period_end: string | null;
    provider_subscription_id: string | null;
    plan_type: string | null;
    provider_variant_id: string | null;
  } | null;

  if (!row) return emptyInfo;

  const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const paid = hasPaidAccess(row.status, trialEndsAt, currentPeriodEnd);
  const planType = resolvePlanType(row.plan_type, paid, row.provider_subscription_id, row.status);
  const tier: SubscriptionTier = paid ? 'pro' : 'free';

  let daysLeftInTrial: number | null = null;
  if (row.status === 'trialing' && trialEndsAt && trialEndsAt.getTime() > Date.now()) {
    daysLeftInTrial = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  const fiftyYears = 50 * 365 * 86400_000;
  const isLifetime =
    currentPeriodEnd !== null && currentPeriodEnd.getTime() - Date.now() > fiftyYears;
  const isCourtesy = row.status === 'active' && !row.provider_subscription_id;
  const isYearly = isYearlyPlanVariant(row.provider_variant_id);

  return {
    tier,
    planType,
    hasOcr: paid && planIncludesOcr(planType),
    hasWa: paid && planIncludesWa(planType),
    status: row.status,
    trialEndsAt,
    daysLeftInTrial,
    currentPeriodEnd,
    providerSubscriptionId: row.provider_subscription_id,
    isLifetime,
    isCourtesy,
    isYearly,
  };
};

export const hasOcrAccess = (sub: SubscriptionInfo): boolean => sub.hasOcr;

export const hasWaAccess = (sub: SubscriptionInfo): boolean => sub.hasWa;

export const requireOcrAccess = async () => {
  const sub = await getSubscription();
  if (!hasOcrAccess(sub)) {
    throw new Error('Escanear tickets requiere activar el complemento OCR.');
  }
  return sub;
};

/** @deprecated Usar requireOcrAccess */
export const requirePro = requireOcrAccess;

/** Evalúa acceso WA desde una fila de subscriptions (cron / server). */
export const subscriptionRowHasWa = (row: {
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  provider_subscription_id: string | null;
  plan_type: string | null;
}): boolean => {
  const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const paid = hasPaidAccess(
    row.status as SubscriptionInfo['status'],
    trialEndsAt,
    currentPeriodEnd,
  );
  const planType = resolvePlanType(
    row.plan_type,
    paid,
    row.provider_subscription_id,
    row.status as SubscriptionInfo['status'],
  );
  return paid && planIncludesWa(planType);
};
