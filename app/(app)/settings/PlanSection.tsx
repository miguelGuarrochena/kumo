'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Check, Loader2, XCircle } from 'lucide-react';
import type { SubscriptionInfo } from '@/lib/subscription';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useT } from '@/lib/i18n/client';

type Props = {
  sub: SubscriptionInfo;
  priceMonthly: string;
  priceYearly: string;
  yearlySavingsPct: number;
};

export const PlanSection = ({ sub, priceMonthly, priceYearly, yearlySavingsPct }: Props) => {
  const { t, locale } = useT();
  const tb = t.billing;
  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'cancel' | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

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
  const isInTrial = sub.status === 'trialing';
  const trialDaysLeft = sub.daysLeftInTrial ?? 0;
  const now = Date.now();
  const isCanceledWithAccess =
    sub.status === 'canceled' && sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() > now;
  const showCheckout = !isPaying && !isCanceledWithAccess && (!isInTrial || trialDaysLeft <= 7);
  const dateFmt = (d: Date) => d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR');

  return (
    <div id="plan" className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{tb.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isPaying && (sub.isLifetime ? tb.lifetime_label : sub.isCourtesy ? tb.courtesy_label : tb.subtitle_active)}
            {sub.status === 'trialing' && sub.daysLeftInTrial !== null && (
              sub.daysLeftInTrial === 1
                ? tb.subtitle_trial_day
                : tb.subtitle_trial_days.replace('{n}', String(sub.daysLeftInTrial))
            )}
            {sub.tier === 'free' && sub.status !== 'trialing' && tb.subtitle_expired}
          </p>
        </div>
      </div>

      {isPaying && sub.isLifetime && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-200">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{tb.lifetime_label}</p>
              <p className="text-xs opacity-80 mt-0.5">{tb.lifetime_desc}</p>
            </div>
          </div>
        </div>
      )}

      {isPaying && !sub.isLifetime && sub.isCourtesy && (
        <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-3">
          <div className="flex items-start gap-2 text-sm text-sky-700 dark:text-sky-200">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{tb.courtesy_label}</p>
              {sub.currentPeriodEnd && (
                <p className="text-xs opacity-80 mt-0.5">
                  {tb.courtesy_until.replace('{date}', dateFmt(sub.currentPeriodEnd))}
                </p>
              )}
              <p className="text-xs opacity-80 mt-1.5">{tb.courtesy_desc}</p>
            </div>
          </div>
        </div>
      )}

      {isPaying && !sub.isLifetime && !sub.isCourtesy && (
        <div className="space-y-3">
          <div className="rounded-xl border border-mint-200 dark:border-mint-500/30 bg-mint-50 dark:bg-mint-500/10 p-3">
            <div className="flex items-start gap-2 text-sm text-mint-700 dark:text-mint-200">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{tb.active_label}</p>
                {sub.currentPeriodEnd && (
                  <p className="text-xs opacity-80 mt-0.5">
                    {tb.next_charge.replace('{date}', dateFmt(sub.currentPeriodEnd))}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={loading === 'cancel'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
          >
            {loading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {tb.cancel_button}
          </button>
        </div>
      )}

      {isCanceledWithAccess && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-200">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{tb.canceled_label}</p>
                {sub.currentPeriodEnd && (
                  <p className="text-xs opacity-80 mt-0.5">
                    {tb.canceled_keep_until.replace('{date}', dateFmt(sub.currentPeriodEnd))}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <PlanCard
              title={tb.plan_monthly}
              price={priceMonthly}
              period={tb.per_month}
              highlight={false}
              loading={loading === 'monthly'}
              labelSubscribe={tb.resubscribe_button}
              labelOpening={tb.opening_provider}
              onClick={() => openCheckout('monthly')}
            />
            <PlanCard
              title={tb.plan_yearly}
              price={priceYearly}
              period={tb.per_year}
              saveLabel={tb.save_label.replace('{pct}', String(yearlySavingsPct))}
              highlight
              loading={loading === 'yearly'}
              labelSubscribe={tb.resubscribe_button}
              labelOpening={tb.opening_provider}
              onClick={() => openCheckout('yearly')}
            />
          </div>
        </div>
      )}

      {!isPaying && !isCanceledWithAccess && isInTrial && !showCheckout && (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-200">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{tb.trial_active_label}</p>
                {sub.trialEndsAt && (
                  <p className="text-xs opacity-80 mt-0.5">
                    {tb.trial_active_until.replace('{date}', dateFmt(sub.trialEndsAt))}
                  </p>
                )}
                <p className="text-xs opacity-80 mt-1.5">{tb.trial_active_desc}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <Feature>{tb.feature_ocr}</Feature>
            <Feature>{tb.feature_spaces}</Feature>
            <Feature>{tb.feature_history}</Feature>
          </ul>
        </div>
      )}

      {showCheckout && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <PlanCard
              title={tb.plan_monthly}
              price={priceMonthly}
              period={tb.per_month}
              highlight={false}
              loading={loading === 'monthly'}
              labelSubscribe={tb.subscribe_button}
              labelOpening={tb.opening_provider}
              onClick={() => openCheckout('monthly')}
            />
            <PlanCard
              title={tb.plan_yearly}
              price={priceYearly}
              period={tb.per_year}
              saveLabel={tb.save_label.replace('{pct}', String(yearlySavingsPct))}
              highlight
              loading={loading === 'yearly'}
              labelSubscribe={tb.subscribe_button}
              labelOpening={tb.opening_provider}
              onClick={() => openCheckout('yearly')}
            />
          </div>

          <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <Feature>{tb.feature_ocr}</Feature>
            <Feature>{tb.feature_spaces}</Feature>
            <Feature>{tb.feature_history}</Feature>
          </ul>
        </>
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

const PlanCard = ({
  title, price, period, saveLabel, highlight, loading, labelSubscribe, labelOpening, onClick,
}: {
  title: string;
  price: string;
  period: string;
  saveLabel?: string;
  highlight: boolean;
  loading: boolean;
  labelSubscribe: string;
  labelOpening: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={`relative text-left rounded-xl border-2 p-4 transition-all hover:scale-[1.01] disabled:opacity-50 ${
      highlight
        ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/60 dark:bg-amber-500/5'
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
    }`}
  >
    {saveLabel && (
      <span className="absolute -top-2 right-3 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">
        {saveLabel}
      </span>
    )}
    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">{title}</p>
    <div className="mt-1.5 flex items-baseline gap-1">
      <span className="text-2xl font-bold">{price}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{period}</span>
    </div>
    <div className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {loading ? labelOpening : labelSubscribe}
    </div>
  </button>
);

const Feature = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <Check className="w-4 h-4 mt-0.5 text-mint-500 shrink-0" />
    <span>{children}</span>
  </li>
);
