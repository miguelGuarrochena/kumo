import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getSubscription } from '@/lib/subscription';
import { getMessages } from '@/lib/i18n/server';
import { getPricing } from '@/lib/pricing';

export const TrialBanner = async () => {
  const [sub, messages] = await Promise.all([getSubscription(), getMessages()]);
  const tb = messages.billing;
  const priceMonthly = getPricing().monthly;

  if (sub.status === 'active') return null;
  if (sub.status === 'trialing' && sub.daysLeftInTrial !== null && sub.daysLeftInTrial > 7) {
    return null;
  }

  const isTrial = sub.status === 'trialing' && sub.daysLeftInTrial !== null;
  const isExpired = !isTrial && sub.tier === 'free';

  let text = '';
  if (isTrial && sub.daysLeftInTrial! > 1) {
    text = tb.banner_trial_days
      .replace('{n}', String(sub.daysLeftInTrial))
      .replace('{price}', priceMonthly);
  } else if (isTrial && sub.daysLeftInTrial === 1) {
    text = tb.banner_trial_day.replace('{price}', priceMonthly);
  } else if (isExpired) {
    text = tb.banner_expired.replace('{price}', priceMonthly);
  }

  return (
    <Link
      href="/settings#plan"
      className="block px-4 py-2 text-sm text-center text-amber-800 dark:text-amber-100 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200/60 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
    >
      <Sparkles className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
      {text}
    </Link>
  );
};
