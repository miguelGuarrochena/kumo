'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Check, MessageCircle, Camera, Layers } from 'lucide-react';
import type { Pricing } from '@/lib/pricing';
import type { CheckoutInterval, PlanProduct } from '@/lib/plans';
import { useT } from '@/lib/i18n/client';

type Props = {
  pricing: Pricing;
  highlightProduct?: PlanProduct;
  onCheckout: (product: PlanProduct, interval: CheckoutInterval) => void;
  loadingKey: string | null;
  compact?: boolean;
};

const PRODUCT_META: Record<PlanProduct, { icon: typeof Camera; tone: string }> = {
  ocr: { icon: Camera, tone: 'sky' },
  wa: { icon: MessageCircle, tone: 'mint' },
  bundle: { icon: Layers, tone: 'amber' },
};

export const ProPlansGrid = ({
  pricing,
  highlightProduct = 'bundle',
  onCheckout,
  loadingKey,
  compact = false,
}: Props) => {
  const { t } = useT();
  const b = t.billing;
  const [selected, setSelected] = useState<PlanProduct>(highlightProduct);
  const [yearlyRenew, setYearlyRenew] = useState<'once' | 'auto'>('once');

  const products: PlanProduct[] = ['ocr', 'wa', 'bundle'];
  const labels: Record<PlanProduct, { title: string; desc: string; features: string[] }> = {
    ocr: { title: b.product_ocr_title, desc: b.product_ocr_desc, features: [b.feature_ocr] },
    wa: { title: b.product_wa_title, desc: b.product_wa_desc, features: [b.feature_wa_auto] },
    bundle: {
      title: b.product_bundle_title,
      desc: b.product_bundle_desc,
      features: [b.feature_ocr, b.feature_wa_auto, b.feature_bundle_save],
    },
  };

  const prices = pricing[selected];
  const yearlyInterval: CheckoutInterval = yearlyRenew === 'once' ? 'yearly_once' : 'yearly_auto';

  return (
    <div className="space-y-4">
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {products.map((product) => {
          const meta = PRODUCT_META[product];
          const Icon = meta.icon;
          const active = selected === product;
          const isBundle = product === 'bundle';
          return (
            <button
              key={product}
              type="button"
              onClick={() => setSelected(product)}
              className={`text-left rounded-xl border-2 p-3.5 transition-all ${
                active
                  ? isBundle
                    ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/60 dark:bg-amber-500/5'
                    : 'border-sky-300 dark:border-sky-500/50 bg-sky-50/50 dark:bg-sky-900/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {isBundle && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">
                  {b.recommended}
                </span>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Icon className={`w-4 h-4 ${isBundle ? 'text-amber-600' : 'text-sky-600'}`} />
                <p className="font-semibold text-sm">{labels[product].title}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {labels[product].desc}
              </p>
              <p className="text-sm font-bold mt-2">{pricing[product].monthly}{b.per_month}</p>
            </button>
          );
        })}
      </div>

      <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
        {labels[selected].features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-mint-500 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="grid sm:grid-cols-2 gap-2">
        <CheckoutBtn
          title={b.plan_monthly}
          price={prices.monthly}
          period={b.per_month}
          loading={loadingKey === `${selected}-monthly`}
          onClick={() => onCheckout(selected, 'monthly')}
          subscribeLabel={b.subscribe_button}
          openingLabel={b.opening_provider}
        />
        <div className="relative rounded-xl border-2 border-amber-300 dark:border-amber-500/50 bg-amber-50/60 dark:bg-amber-500/5 p-3">
          <span className="absolute -top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">
            {b.save_label.replace('{pct}', String(pricing.yearlyPct))}
          </span>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{b.plan_yearly}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold">{prices.yearly}</span>
            <span className="text-xs text-slate-500">{b.per_year}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setYearlyRenew('once')}
              className={`rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                yearlyRenew === 'once'
                  ? 'border-amber-400 bg-white dark:bg-slate-900 font-medium text-amber-700 dark:text-amber-300'
                  : 'border-transparent bg-amber-100/50 dark:bg-amber-500/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {b.yearly_once_label}
            </button>
            <button
              type="button"
              onClick={() => setYearlyRenew('auto')}
              className={`rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                yearlyRenew === 'auto'
                  ? 'border-amber-400 bg-white dark:bg-slate-900 font-medium text-amber-700 dark:text-amber-300'
                  : 'border-transparent bg-amber-100/50 dark:bg-amber-500/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {b.yearly_auto_label}
            </button>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            {yearlyRenew === 'once' ? b.yearly_once_desc : b.yearly_auto_desc}
          </p>

          <button
            type="button"
            onClick={() => onCheckout(selected, yearlyInterval)}
            disabled={loadingKey === `${selected}-${yearlyInterval}`}
            className="mt-3 w-full text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loadingKey === `${selected}-${yearlyInterval}`
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />}
            {loadingKey === `${selected}-${yearlyInterval}` ? b.opening_provider : b.subscribe_button}
          </button>
        </div>
      </div>

      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
        <li>{b.checkout_monthly_note}</li>
        <li>{b.checkout_yearly_once_note}</li>
        <li>{b.checkout_yearly_auto_note}</li>
      </ul>
      <p className="text-xs text-slate-500 dark:text-slate-400">{b.price_adjustment_note}</p>
    </div>
  );
};

const CheckoutBtn = ({
  title, price, period, loading, onClick, subscribeLabel, openingLabel,
}: {
  title: string;
  price: string;
  period: string;
  loading: boolean;
  onClick: () => void;
  subscribeLabel: string;
  openingLabel: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="relative text-left rounded-xl border-2 p-3 transition-all hover:scale-[1.01] disabled:opacity-50 border-slate-200 dark:border-slate-700"
  >
    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{title}</p>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="text-xl font-bold">{price}</span>
      <span className="text-xs text-slate-500">{period}</span>
    </div>
    <div className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {loading ? openingLabel : subscribeLabel}
    </div>
  </button>
);
