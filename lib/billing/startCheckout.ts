import { checkoutIntervalToPlan, type CheckoutInterval, type PlanProduct } from '@/lib/plans';
import { BILLING_TERMS_VERSION } from '@/lib/legal/billingTerms';

export const startBillingCheckout = async (
  product: PlanProduct,
  interval: CheckoutInterval,
): Promise<{ url?: string; error?: string }> => {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product,
      interval: checkoutIntervalToPlan(interval),
      acceptTerms: true,
      termsVersion: BILLING_TERMS_VERSION,
    }),
  });
  return res.json() as Promise<{ url?: string; error?: string }>;
};
