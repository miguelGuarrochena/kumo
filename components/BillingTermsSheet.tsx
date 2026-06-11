'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';
import type { CheckoutInterval, PlanProduct } from '@/lib/plans';

type Props = {
  open: boolean;
  product: PlanProduct | null;
  interval: CheckoutInterval | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const BillingTermsSheet = ({
  open,
  product,
  interval,
  loading,
  onClose,
  onConfirm,
}: Props) => {
  const { t } = useT();
  const b = t.billing;
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (open) setAccepted(false);
  }, [open, product, interval]);

  const showWa = product === 'wa' || product === 'bundle';
  const showOcr = product === 'ocr' || product === 'bundle';

  const handleClose = () => {
    setAccepted(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!accepted) return;
    onConfirm();
  };

  return (
    <Sheet open={open} onClose={handleClose} title={b.terms_checkout_title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {b.terms_checkout_intro}
        </p>

        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-5">
          <li>{b.terms_checkout_bullet_mp}</li>
          <li>{b.terms_checkout_bullet_refund}</li>
          {showWa && <li>{b.terms_checkout_bullet_wa}</li>}
          {showOcr && <li>{b.terms_checkout_bullet_ocr}</li>}
          <li>{b.terms_checkout_bullet_record}</li>
        </ul>

        <p className="text-sm">
          <Link href="/legal/terms" target="_blank" className="text-sky-600 dark:text-sky-400 underline font-medium">
            {b.terms_checkout_link}
          </Link>
        </p>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 rounded text-sky-600 w-4 h-4"
          />
          <span className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {b.terms_checkout_checkbox}
          </span>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!accepted || loading}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? b.opening_provider : b.terms_checkout_continue}
          </button>
        </div>
      </div>
    </Sheet>
  );
};
