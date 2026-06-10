'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';

type Props = {
  open: boolean;
  onClose: () => void;
  priceMonthly: string;
  priceYearly: string;
  yearlyPct: number;
  trialDaysLeft: number | null;
};

export const OcrPaywallSheet = ({
  open,
  onClose,
  priceMonthly,
  priceYearly,
  yearlyPct,
  trialDaysLeft,
}: Props) => {
  const { t } = useT();
  const o = t.ocr;
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const openCheckout = async (interval: 'monthly' | 'yearly') => {
    setLoading(interval);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: interval === 'yearly' ? 'year' : 'month' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? t.billing.checkout_error);
    } catch {
      toast.error(t.billing.connect_error);
    } finally {
      setLoading(null);
    }
  };

  const trialHint =
    trialDaysLeft === null ? null
    : trialDaysLeft === 1 ? o.paywall_trial_day
    : trialDaysLeft > 0 ? o.paywall_trial_days.replace('{n}', String(trialDaysLeft))
    : null;

  return (
    <Sheet open={open} onClose={onClose} title={o.paywall_title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 grid place-items-center shrink-0">
            <Camera className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{o.paywall_desc}</p>
        </div>

        {trialHint && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-lg px-3 py-2">
            {trialHint}
          </p>
        )}

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => openCheckout('monthly')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 disabled:opacity-50 text-left"
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{t.billing.plan_monthly}</p>
              <p className="text-lg font-bold mt-0.5">{o.paywall_monthly.replace('{price}', priceMonthly)}</p>
            </div>
            {loading === 'monthly' ? (
              <Loader2 className="w-5 h-5 animate-spin text-sky-500 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => openCheckout('yearly')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 border-amber-300 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-500/5 hover:border-amber-400 disabled:opacity-50 text-left"
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                {t.billing.plan_yearly}
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  {t.billing.save_label.replace('{pct}', String(yearlyPct))}
                </span>
              </p>
              <p className="text-lg font-bold mt-0.5">{o.paywall_yearly.replace('{price}', priceYearly)}</p>
            </div>
            {loading === 'yearly' ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-500 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{o.paywall_settings_hint}</p>
      </div>
    </Sheet>
  );
};
