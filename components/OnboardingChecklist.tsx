'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Check, ArrowRight, X } from 'lucide-react';
import { skipOnboarding } from '@/app/(app)/dashboard/onboardingActions';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';

type Step = {
  done: boolean;
  title: string;
  description: string;
  cta: string;
  href: string;
};

type Props = {
  hasExpense: boolean;
  hasContact: boolean;
  hasReminder: boolean;
};

export const OnboardingChecklist = ({ hasExpense, hasContact, hasReminder }: Props) => {
  const router = useRouter();
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  const steps: Step[] = [
    {
      done: hasExpense,
      title: t.onboarding.step1_title,
      description: t.onboarding.step1_desc,
      cta: t.onboarding.step1_cta,
      href: '/expenses',
    },
    {
      done: hasContact,
      title: t.onboarding.step2_title,
      description: t.onboarding.step2_desc,
      cta: t.onboarding.step2_cta,
      href: '/settings',
    },
    {
      done: hasReminder,
      title: t.onboarding.step3_title,
      description: t.onboarding.step3_desc,
      cta: t.onboarding.step3_cta,
      href: '/calendar?view=upcoming',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = (completed / total) * 100;

  const onSkip = () => {
    startTransition(async () => {
      track('onboarding_skipped');
      await skipOnboarding();
      router.refresh();
    });
  };

  return (
    <section className="kumo-card p-5 sm:p-6 relative">
      <button
        onClick={onSkip}
        disabled={pending}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
        title={t.onboarding.skip}
        aria-label={t.onboarding.skip}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl kumo-gradient grid place-items-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">{t.onboarding.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.onboarding.subtitle}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>{t.onboarding.progress.replace('{done}', String(completed)).replace('{total}', String(total))}</span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full kumo-gradient transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i}>
            <div
              className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
                step.done
                  ? 'border-mint-200 dark:border-mint-500/30 bg-mint-50/50 dark:bg-mint-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5 ${
                  step.done
                    ? 'kumo-gradient'
                    : 'border-2 border-slate-300 dark:border-slate-600'
                }`}
              >
                {step.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium text-sm ${
                    step.done ? 'line-through text-slate-400 dark:text-slate-500' : ''
                  }`}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
              {!step.done && (
                <Link
                  href={step.href as never}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium kumo-gradient text-white hover:opacity-90"
                >
                  {step.cta}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      {completed === total && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium kumo-gradient-text">✓</p>
          <button
            onClick={onSkip}
            disabled={pending}
            className="mt-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {t.common.cancel}
          </button>
        </div>
      )}
    </section>
  );
};
