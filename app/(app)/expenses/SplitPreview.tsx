'use client';

import { Check } from 'lucide-react';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import type { ContactLite } from './splitTypes';

type SplitPreviewProps = {
  participants: ContactLite[];
  computed: Record<string, number>;
  paidById: string | null;
  totalAmount: number;
  sumComputed: number;
  currency: Currency;
};

// Preview visual: cada participante con su monto + total al pie.
export const SplitPreview = ({
  participants,
  computed,
  paidById,
  totalAmount,
  sumComputed,
  currency,
}: SplitPreviewProps) => {
  const { t } = useT();
  const sumOk = Math.abs(sumComputed - totalAmount) < 0.01;
  const diff = totalAmount - sumComputed;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {t.split.preview_each_pays}
        </p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {participants.map((p) => {
          const amount = computed[p.id] ?? 0;
          const isPayer = p.id === paidById;
          return (
            <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-sm truncate flex items-center gap-1.5">
                {p.name}{p.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
                {isPayer && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mint-100 text-mint-600 dark:bg-mint-500/20 dark:text-mint-300 font-semibold uppercase tracking-wider">
                    {t.split.preview_paid_badge}
                  </span>
                )}
              </span>
              <span className="font-semibold text-sm tabular-nums">
                {formatMoney(amount, currency)}
              </span>
            </div>
          );
        })}
      </div>
      <div className={`px-4 py-2.5 flex items-center justify-between gap-2 border-t-2 ${
        sumOk
          ? 'border-mint-200 bg-mint-50/60 dark:border-mint-500/30 dark:bg-mint-500/10'
          : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10'
      }`}>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
          {sumOk ? <Check className="w-3.5 h-3.5 text-mint-600 dark:text-mint-400" /> : null}
          {t.split.preview_total}
        </span>
        <span className="text-sm font-bold tabular-nums">
          {formatMoney(sumComputed, currency)} / {formatMoney(totalAmount, currency)}
        </span>
      </div>
      {!sumOk && (
        <div className="px-4 py-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-500/5">
          {diff > 0
            ? t.split.preview_missing.replace('{amount}', formatMoney(diff, currency))
            : t.split.preview_extra.replace('{amount}', formatMoney(Math.abs(diff), currency))}
        </div>
      )}
    </div>
  );
};
