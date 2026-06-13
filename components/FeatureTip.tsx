'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { dismissFeatureTip, isFeatureTipDismissed } from '@/lib/featureTips';
import { useT } from '@/lib/i18n/client';

type Props = {
  id: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export const FeatureTip = ({ id, title, description, ctaLabel, onCta }: Props) => {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isFeatureTipDismissed(id));
  }, [id]);

  if (!visible) return null;

  const close = () => {
    dismissFeatureTip(id);
    setVisible(false);
  };

  return (
    <div className="kumo-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-sky-200/60 dark:border-sky-500/30 bg-gradient-to-br from-sky-50/80 to-lavender-50/60 dark:from-sky-900/20 dark:to-lavender-900/10">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 grid place-items-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {ctaLabel && onCta && (
          <button
            type="button"
            onClick={() => {
              onCta();
              close();
            }}
            className="px-3 py-2 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90"
          >
            {ctaLabel}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
