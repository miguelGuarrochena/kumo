'use client';

import { Check, Pencil, Trash2, Wallet } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName } from '@/lib/categoryLabels';
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
  onToggleSplitPaid?: (contactId: string, paid: boolean) => void;
  onPaySplit?: (contactId: string, amount: number) => void;
  showFullDate?: boolean;
};

export const ExpenseRow = ({
  expense,
  displayCurrency,
  convertedAmount,
  onEdit,
  onDelete,
  onTogglePaid,
  onToggleSplitPaid,
  onPaySplit,
  showFullDate = false,
}: ExpenseRowProps) => {
  const { t, locale } = useT();
  const isIncome = expense.kind === 'income';
  const cat = expense.categories;
  const catLabel = cat ? categoryDisplayName(cat.name, t) : null;
  const dotColor = isIncome ? 'bg-mint-400' : cat ? COLOR_DOT[cat.color] ?? 'bg-slate-300' : 'bg-slate-300';
  // Cualquier gasto no pagado se muestra como pendiente, tenga due_date o no.
  // Si tiene due_date, diferenciamos visualmente: vencido (rojo), vence hoy
  // (ámbar fuerte) o pendiente futuro (ámbar suave).
  const isPending = !isIncome && !expense.paid;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueDate = expense.due_date ?? null;
  const pendingState: 'overdue' | 'today' | 'future' | 'plain' = isPending
    ? dueDate === null
      ? 'plain'
      : dueDate < todayStr
        ? 'overdue'
        : dueDate === todayStr
          ? 'today'
          : 'future'
    : 'plain';
  const isDifferentCurrency = expense.currency !== displayCurrency;
  const splits = (expense as ExpenseWithSplits)._splits ?? [];
  const pendingSplits = splits.filter((s) => !s.paid).length;

  return (
    <div className="p-3.5 flex items-start gap-3 group active:bg-slate-50/80 dark:active:bg-slate-800/50">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0 mt-1.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm truncate">
            {expense.description || catLabel || (isIncome ? t.expenses.income_default_name : t.expenses.default_name)}
          </p>
          {isIncome && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-mint-100 text-mint-600 dark:bg-mint-500/20 dark:text-mint-300 font-medium">
              {t.expenses.income_badge}
            </span>
          )}
          {isPending && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                pendingState === 'overdue'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'
                  : pendingState === 'today'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                    : 'bg-peach-100 text-peach-500 dark:bg-peach-500/15 dark:text-peach-300'
              }`}
            >
              {pendingState === 'overdue'
                ? t.expenses.overdue
                : pendingState === 'today'
                  ? t.expenses.due_today
                  : t.expenses.pending}
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
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 font-medium">
              {t.expenses.divided}
              {pendingSplits > 0 && (
                <span className="opacity-80"> · {pendingSplits} {t.expenses.split_pending_short}</span>
              )}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {catLabel ?? t.expenses.no_category} · {showFullDate ? formatFullDate(expense.expense_date, locale) : formatDate(expense.expense_date, locale)}
          {expense.due_date && ` · ${t.expenses.due_short} ${formatDate(expense.due_date, locale)}`}
        </p>
        {splits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
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
                  className={`inline-flex items-center gap-0.5 pl-2 pr-1 py-1 rounded-lg text-[11px] font-medium border ${
                    s.paid
                      ? 'bg-mint-50 text-mint-700 border-mint-200 dark:bg-mint-500/15 dark:text-mint-300 dark:border-mint-500/30'
                      : 'bg-peach-50 text-peach-700 border-peach-200 dark:bg-peach-500/15 dark:text-peach-300 dark:border-peach-500/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSplitPaid?.(s.contact_id, !s.paid)}
                    disabled={!onToggleSplitPaid}
                    title={s.paid ? t.expenses.split_mark_pending : t.expenses.split_mark_paid}
                    className={`inline-flex items-center gap-1 pr-0.5 ${onToggleSplitPaid ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="truncate max-w-[5.5rem] sm:max-w-none">{s.contact_name}</span>
                    {portion !== null && (
                      <span className="tabular-nums opacity-90 shrink-0">
                        {formatMoney(portion, expense.currency as Currency, locale)}
                      </span>
                    )}
                    <span
                      className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${
                        s.paid ? 'bg-mint-500 text-white' : 'bg-peach-300/80 text-white dark:bg-peach-500'
                      }`}
                    >
                      {s.paid ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : null}
                    </span>
                  </button>
                  {!s.paid && onPaySplit && portion !== null && portion > 0 && (
                    <button
                      type="button"
                      onClick={() => onPaySplit(s.contact_id, portion)}
                      className="p-1 rounded-md text-sky-600 dark:text-sky-400 hover:bg-sky-100/80 dark:hover:bg-sky-500/20"
                      title={t.expenses.split_pay_chip}
                      aria-label={t.expenses.split_pay_chip}
                    >
                      <Wallet className="w-3 h-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="text-right shrink-0 pt-0.5">
        {isDifferentCurrency && convertedAmount === null ? (
          <p className={`font-semibold text-sm whitespace-nowrap ${isIncome ? 'text-mint-600 dark:text-mint-400' : 'text-lavender-500 dark:text-lavender-400'}`}>
            {isIncome ? '+' : ''}{formatMoney(Number(expense.amount), expense.currency as Currency, locale)}
          </p>
        ) : (
          <>
            <p className={`font-semibold text-sm whitespace-nowrap ${isIncome ? 'text-mint-600 dark:text-mint-400' : 'text-lavender-500 dark:text-lavender-400'}`}>
              {isIncome ? '+' : ''}{formatMoney(
                isDifferentCurrency ? (convertedAmount ?? 0) : Number(expense.amount),
                displayCurrency,
                locale,
              )}
            </p>
            {isDifferentCurrency && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
                ≈ {formatMoney(Number(expense.amount), expense.currency as Currency, locale)}
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
