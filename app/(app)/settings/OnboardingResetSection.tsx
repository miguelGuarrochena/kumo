'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/client';
import { reopenOnboarding } from '@/app/(app)/dashboard/onboardingActions';

export const OnboardingResetSection = () => {
  const router = useRouter();
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  const onReopen = () => {
    startTransition(async () => {
      const result = await reopenOnboarding();
      if (result.ok) {
        toast.success(t.settings.onboarding_reopen_toast);
        router.push('/dashboard');
      } else {
        toast.error(t.common.error);
      }
    });
  };

  return (
    <div className="kumo-card p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl kumo-gradient grid place-items-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{t.settings.onboarding_reopen_title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.settings.onboarding_reopen_desc}
          </p>
          <button
            type="button"
            onClick={onReopen}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {t.settings.onboarding_reopen_cta}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
