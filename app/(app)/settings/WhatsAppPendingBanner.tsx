'use client';

import { MessageCircle } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

export const WhatsAppPendingBanner = () => {
  const { t } = useT();

  return (
    <div className="kumo-card p-4 border-amber-200/60 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 grid place-items-center shrink-0">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
            {t.settings.whatsapp_pending_title}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
            {t.settings.whatsapp_pending_desc}
          </p>
        </div>
      </div>
    </div>
  );
};
