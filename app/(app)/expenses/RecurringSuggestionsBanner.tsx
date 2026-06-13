'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, X } from 'lucide-react';
import { markExpenseRecurring } from './actions';
import { useT } from '@/lib/i18n/client';
import type { RecurringSuggestion } from '@/lib/recurringSuggest';

type Props = {
  suggestions: RecurringSuggestion[];
};

export const RecurringSuggestionsBanner = ({ suggestions }: Props) => {
  const router = useRouter();
  const { t } = useT();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const visible = suggestions.filter(
    (s) => !dismissed.has(s.latestExpenseId),
  );
  if (visible.length === 0) return null;

  const recurrenceLabel = (type: RecurringSuggestion['recurrenceType']) => {
    if (type === 'weekly') return t.expenses.recurrence_weekly;
    if (type === 'yearly') return t.expenses.recurrence_yearly;
    return t.expenses.recurrence_monthly;
  };

  const onMark = (s: RecurringSuggestion) => {
    startTransition(async () => {
      const result = await markExpenseRecurring(s.latestExpenseId, s.recurrenceType);
      if (result.ok) {
        toast.success(t.expenses.recurring_marked);
        setDismissed((prev) => new Set(prev).add(s.latestExpenseId));
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    });
  };

  return (
    <div className="space-y-2">
      {visible.map((s) => (
        <div
          key={s.latestExpenseId}
          className="kumo-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-amber-200/60 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                {t.expenses.recurring_suggest_title.replace('{name}', s.description)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {t.expenses.recurring_suggest_desc
                  .replace('{count}', String(s.matchCount))
                  .replace('{period}', recurrenceLabel(s.recurrenceType).toLowerCase())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={pending}
              onClick={() => onMark(s)}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {t.expenses.recurring_suggest_cta.replace('{period}', recurrenceLabel(s.recurrenceType))}
            </button>
            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set(prev).add(s.latestExpenseId))}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t.common.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
