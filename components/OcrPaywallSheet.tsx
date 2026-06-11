'use client';

import { Camera, MessageCircle } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { ProPlansGrid } from '@/components/ProPlansGrid';
import type { Pricing } from '@/lib/pricing';
import type { CheckoutInterval, PlanProduct } from '@/lib/plans';
import { useT } from '@/lib/i18n/client';

type Props = {
  open: boolean;
  onClose: () => void;
  pricing: Pricing;
  product?: PlanProduct;
  onCheckout: (product: PlanProduct, interval: CheckoutInterval) => Promise<void>;
  loadingKey: string | null;
  trialDaysLeft?: number | null;
};

export const OcrPaywallSheet = ({
  open,
  onClose,
  pricing,
  product = 'ocr',
  onCheckout,
  loadingKey,
  trialDaysLeft = null,
}: Props) => {
  const { t } = useT();
  const o = t.ocr;
  const w = t.billing;

  const title =
    product === 'wa' ? w.product_wa_title
    : product === 'bundle' ? w.product_bundle_title
    : o.paywall_title;

  const desc =
    product === 'wa' ? w.product_wa_desc
    : product === 'bundle' ? w.product_bundle_desc
    : o.paywall_desc;

  const Icon = product === 'wa' ? MessageCircle : Camera;

  const trialHint =
    trialDaysLeft === null ? null
    : trialDaysLeft === 1 ? o.paywall_trial_day
    : trialDaysLeft > 0 ? o.paywall_trial_days.replace('{n}', String(trialDaysLeft))
    : null;

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 grid place-items-center shrink-0">
            <Icon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
        </div>

        {trialHint && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-lg px-3 py-2">
            {trialHint}
          </p>
        )}

        <ProPlansGrid
          pricing={pricing}
          highlightProduct={product}
          onCheckout={(p, i) => { void onCheckout(p, i); }}
          loadingKey={loadingKey}
          compact
        />

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{o.paywall_settings_hint}</p>
      </div>
    </Sheet>
  );
};
