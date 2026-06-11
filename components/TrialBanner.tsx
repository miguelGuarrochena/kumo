import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getSubscription } from '@/lib/subscription';
import { getMessages } from '@/lib/i18n/server';
import { getPricing } from '@/lib/pricing';

export const TrialBanner = async () => {
  const [sub, messages] = await Promise.all([getSubscription(), getMessages()]);
  const tb = messages.billing;
  const pricing = getPricing();
  const priceMonthly =
    sub.planType === 'ocr' ? pricing.ocr.monthly
    : sub.planType === 'wa' ? pricing.wa.monthly
    : pricing.bundle.monthly;
  const now = Date.now();

  const inGrace =
    sub.status === 'canceled' &&
    sub.currentPeriodEnd !== null &&
    sub.currentPeriodEnd.getTime() > now;

  if (sub.status === 'active' || inGrace) return null;

  const isTrial =
    sub.status === 'trialing' &&
    sub.trialEndsAt !== null &&
    sub.trialEndsAt.getTime() > now &&
    sub.daysLeftInTrial !== null;

  const trialEnded =
    sub.trialEndsAt !== null && sub.trialEndsAt.getTime() <= now;

  const subscriptionEnded =
    sub.status === 'canceled' &&
    sub.currentPeriodEnd !== null &&
    sub.currentPeriodEnd.getTime() <= now;

  let text = '';

  if (isTrial && sub.daysLeftInTrial! > 7) return null;

  if (isTrial && sub.daysLeftInTrial! > 1) {
    text = tb.banner_trial_days
      .replace('{n}', String(sub.daysLeftInTrial))
      .replace('{price}', priceMonthly);
  } else if (isTrial && sub.daysLeftInTrial === 1) {
    text = tb.banner_trial_day.replace('{price}', priceMonthly);
  } else if (trialEnded || subscriptionEnded) {
    text = tb.banner_expired.replace('{price}', priceMonthly);
  }

  if (!text) return null;

  return (
    <Link
      href="/settings#plans"
      className="block px-4 py-2 text-sm text-center text-amber-800 dark:text-amber-100 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200/60 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
    >
      <Sparkles className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
      {text}
    </Link>
  );
};
