'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Check, Loader2, XCircle } from 'lucide-react';
import type { SubscriptionInfo } from '@/lib/subscription';
import type { Pricing } from '@/lib/pricing';
import type { CheckoutInterval, PlanProduct } from '@/lib/plans';
import { startBillingCheckout } from '@/lib/billing/startCheckout';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ProPlansGrid } from '@/components/ProPlansGrid';
import { useT } from '@/lib/i18n/client';

type Props = {
  sub: SubscriptionInfo;
  pricing: Pricing;
  waUsageMonth?: number;
  waMonthlyCap?: number;
};

export const PlanSection = ({ sub, pricing, waUsageMonth = 0, waMonthlyCap = 200 }: Props) => {
  const { t, locale } = useT();
  const tb = t.billing;
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const openCheckout = async (product: PlanProduct, interval: CheckoutInterval) => {
    const key = `${product}-${interval}`;
    setLoading(key);
    try {
      const data = await startBillingCheckout(product, interval);
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? tb.checkout_error);
    } catch {
      toast.error(tb.connect_error);
    } finally {
      setLoading(null);
    }
  };

  const cancelSub = async () => {
    setLoading('cancel');
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success(tb.cancel_success);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error(data.error ?? tb.cancel_error);
      }
    } catch {
      toast.error(tb.cancel_error);
    } finally {
      setLoading(null);
      setConfirmCancel(false);
    }
  };

  const isPaying = sub.status === 'active';
  const now = Date.now();
  const isInActiveTrial =
    sub.status === 'trialing' &&
    sub.trialEndsAt !== null &&
    sub.trialEndsAt.getTime() > now &&
    sub.daysLeftInTrial !== null &&
    sub.daysLeftInTrial > 0;
  const trialEnded = sub.trialEndsAt !== null && sub.trialEndsAt.getTime() <= now;
  const subscriptionEnded =
    sub.status === 'canceled' &&
    sub.currentPeriodEnd !== null &&
    sub.currentPeriodEnd.getTime() <= now;
  const isCanceledWithAccess =
    sub.status === 'canceled' && sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() > now;
  const showCheckout = !isPaying && !isCanceledWithAccess && !isInActiveTrial;
  const dateFmt = (d: Date) => d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR');

  // Si la cuenta tiene bundle/wa pero WA está pending (no implementado),
  // la mostramos como plan OCR — el user pagó por algo que sólo va a tener
  // OCR mientras dure la pausa de WhatsApp.
  const effectivePlanType =
    (sub.planType === 'bundle' || sub.planType === 'wa') && !sub.hasWa
      ? 'ocr'
      : sub.planType;

  const activePlanLabel =
    effectivePlanType === 'bundle' ? tb.product_bundle_title
    : effectivePlanType === 'wa' ? tb.product_wa_title
    : effectivePlanType === 'ocr' ? tb.product_ocr_title
    : tb.title;

  const activeFeatures = [
    sub.hasOcr && tb.feature_ocr,
    sub.hasWa && tb.feature_wa_auto,
  ].filter(Boolean) as string[];

  return (
    <div id="plans" className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{tb.plans_title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isPaying && (sub.isLifetime ? tb.lifetime_label : sub.isCourtesy ? tb.courtesy_label : tb.subtitle_active)}
            {isInActiveTrial && sub.trialEndsAt && sub.planType === 'ocr' && (
              sub.daysLeftInTrial === 1
                ? tb.subtitle_trial_ocr_day.replace('{date}', dateFmt(sub.trialEndsAt))
                : tb.subtitle_trial_ocr_days
                    .replace('{n}', String(sub.daysLeftInTrial))
                    .replace('{date}', dateFmt(sub.trialEndsAt))
            )}
            {isInActiveTrial && sub.trialEndsAt && sub.planType !== 'ocr' && (
              sub.daysLeftInTrial === 1
                ? tb.subtitle_trial_day
                : tb.subtitle_trial_days.replace('{n}', String(sub.daysLeftInTrial))
            )}
            {!isPaying && !isInActiveTrial && !isCanceledWithAccess && (
              trialEnded || subscriptionEnded ? tb.subtitle_expired : tb.subtitle_inactive
            )}
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{tb.section_free_note}</p>

      {(isPaying || isCanceledWithAccess || isInActiveTrial) && activeFeatures.length > 0 && (
        <div className="rounded-xl border border-mint-200 dark:border-mint-500/30 bg-mint-50 dark:bg-mint-500/10 p-3 mb-4">
          <p className="text-sm font-medium text-mint-700 dark:text-mint-200">{activePlanLabel}</p>
          <ul className="mt-2 space-y-1">
            {activeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-mint-700/90 dark:text-mint-200/90">
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {isInActiveTrial && sub.trialEndsAt && (
            <p className="text-xs opacity-80 mt-2">
              {tb.trial_active_until.replace('{date}', dateFmt(sub.trialEndsAt))}
            </p>
          )}
          {sub.currentPeriodEnd && (isPaying || isCanceledWithAccess) && (
            <p className="text-xs opacity-80 mt-2">
              {isCanceledWithAccess
                ? tb.canceled_keep_until.replace('{date}', dateFmt(sub.currentPeriodEnd))
                : sub.isYearlyOneTime
                  ? tb.plan_expires.replace('{date}', dateFmt(sub.currentPeriodEnd))
                  : tb.next_charge.replace('{date}', dateFmt(sub.currentPeriodEnd))}
            </p>
          )}
          {sub.hasWa && (
            <p
              className={`text-xs mt-2 ${
                waMonthlyCap > 0 && waUsageMonth / waMonthlyCap >= 0.85
                  ? 'text-amber-700 dark:text-amber-300 font-medium'
                  : 'opacity-80'
              }`}
            >
              {tb.wa_usage_month
                .replace('{used}', String(waUsageMonth))
                .replace('{cap}', String(waMonthlyCap))}
            </p>
          )}
        </div>
      )}

      {isPaying && !sub.isLifetime && !sub.isCourtesy && !sub.isYearlyOneTime && (
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          disabled={loading === 'cancel'}
          className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
        >
          {loading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          {tb.cancel_button}
        </button>
      )}

      {(showCheckout || isCanceledWithAccess) && (
        <ProPlansGrid
          pricing={pricing}
          onCheckout={openCheckout}
          loadingKey={loading}
        />
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancelSub}
        title={tb.cancel_title}
        description={tb.cancel_desc}
      />
    </div>
  );
};
