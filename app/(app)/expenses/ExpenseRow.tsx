'use client';

import { Pencil, Trash2, Check } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { formatMoney, type Currency } from '@/lib/currency';
import type { Expense, ExpenseWithSplits } from './types';
import { COLOR_DOT, formatDate, formatFullDate } from './utils';

type ExpenseRowProps = {
  expense: Expense;
  displayCurrency: Currency;
  convertedAmount: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
  showFullDate?: boolean;
};

export const ExpenseRow = ({
  expense,
  displayCurrency,
  convertedAmount,
  onEdit,
  onDelete,
  onTogglePaid,
  showFullDate = false,
}: ExpenseRowProps) => {
  const { t, locale } = useT();
  const cat = expense.categories;
  const dotColor = cat ? COLOR_DOT[cat.color] ?? 'bg-slate-300' : 'bg-slate-300';
  const isPending = expense.due_date && !expense.paid;
  const isDifferentCurrency = expense.currency !== displayCurrency;
  const splits = (expense as ExpenseWithSplits)._splits ?? [];

  return (
    <div className="p-3.5 flex items-center gap-3 group active:bg-slate-50/80">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm truncate">
            {expense.description || cat?.name || t.expenses.default_name}
          </p>
          {isPending && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-peach-100 text-peach-400 font-medium">
              {t.expenses.pending}
            </span>
          )}
          {expense.is_recurring && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lavender-100 text-lavender-500 font-medium">
              {expense.recurrence_type === 'monthly'
                ? t.expenses.recurrence_monthly
                : expense.recurrence_type === 'weekly'
                  ? t.expenses.recurrence_weekly
                  : t.expenses.recurrence_yearly}
            </span>
          )}
          {splits.length > 0 && (
            <button
              type="button"
              onClick={onEdit}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 font-medium hover:bg-sky-200 dark:hover:bg-sky-500/30 cursor-pointer"
              title={t.expenses.edit_split}
            >
              {t.expenses.shared} · {splits.length}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {cat?.name ?? t.expenses.no_category} · {showFullDate ? formatFullDate(expense.expense_date, locale) : formatDate(expense.expense_date, locale)}
          {expense.due_date && ` · ${t.expenses.due_short} ${formatDate(expense.due_date, locale)}`}
        </p>
        {splits.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {splits.map((s, i) => {
              const total = Number(expense.amount);
              const portion = s.amount !== null
                ? s.amount
                : s.percentage !== null
                  ? (total * s.percentage) / 100
                  : null;
              return (
                <span
                  key={`${s.contact_id}-${i}`}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  {s.contact_name}{portion !== null && (
                    <span className="opacity-70"> · {formatMoney(portion, expense.currency as Currency)}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        {isDifferentCurrency && convertedAmount === null ? (
          // No hay tasa para convertir: mostramos el monto original sin inventar 0.
          <p className="font-semibold text-sm whitespace-nowrap">
            {formatMoney(Number(expense.amount), expense.currency as Currency)}
          </p>
        ) : (
          <>
            <p className="font-semibold text-sm whitespace-nowrap">
              {formatMoney(
                isDifferentCurrency ? (convertedAmount ?? 0) : Number(expense.amount),
                displayCurrency,
              )}
            </p>
            {isDifferentCurrency && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
                ≈ {formatMoney(Number(expense.amount), expense.currency as Currency)}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        {expense.due_date && (
          <button
            onClick={onTogglePaid}
            className={`p-2 rounded-lg ${
              expense.paid ? 'text-mint-500 hover:bg-mint-50' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={expense.paid ? t.expenses.mark_pending : t.expenses.mark_paid}
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button onClick={onEdit} aria-label={t.expenses.edit_action} title={t.expenses.edit_action} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} aria-label={t.expenses.delete_action} title={t.expenses.delete_action} className="p-2 rounded-lg hover:bg-rose-100 text-rose-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
