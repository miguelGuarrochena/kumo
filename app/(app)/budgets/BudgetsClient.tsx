'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';
import { iconFor, colorStyleFor } from '@/lib/categoryVisuals';
import { FeatureTip } from '@/components/FeatureTip';
import { FEATURE_TIP_IDS } from '@/lib/featureTips';
import { formatMoney, CURRENCIES, type Currency } from '@/lib/currency';
import { budgetStatus, type BudgetStatus } from '@/lib/budgets';
import { getCategoryPresetKey } from '@/lib/categoryLabels';
import type { Locale } from '@/lib/i18n/types';
import { upsertBudget, deleteBudget } from './actions';

export type BudgetCardData = {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  budgetId: string | null;
  amount: number | null;
  currency: Currency;
  spent: number;
  rateMissing: boolean;
};

const BAR_COLOR: Record<BudgetStatus, string> = {
  ok: 'bg-mint-500',
  warn: 'bg-amber-500',
  over: 'bg-rose-500',
};

const TEXT_COLOR: Record<BudgetStatus, string> = {
  ok: 'text-mint-500',
  warn: 'text-amber-600 dark:text-amber-400',
  over: 'text-rose-600 dark:text-rose-400',
};

type Props = {
  overall: BudgetCardData;
  categories: BudgetCardData[];
  defaultCurrency: Currency;
  locale: Locale;
  assignedToCategories: number;
  assignedRateMissing: boolean;
};

export const BudgetsClient = ({ overall, categories, defaultCurrency, locale, assignedToCategories, assignedRateMissing }: Props) => {
  const { t } = useT();
  const [editing, setEditing] = useState<BudgetCardData | null>(null);

  return (
    <>
      <FeatureTip
        id={FEATURE_TIP_IDS.budgetsIntro}
        title={t.tips.budgets_title}
        description={t.tips.budgets_desc}
      />

      <BudgetCard
        data={overall}
        locale={locale}
        featured
        assigned={assignedToCategories}
        assignedRateMissing={assignedRateMissing}
        onEdit={() => setEditing(overall)}
      />

      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          {t.budgets.by_category}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...categories]
            .sort((a, b) => {
              // 1) Con presupuesto primero. 2) "Otros" al final. 3) Alfabético.
              const aHas = a.amount != null ? 0 : 1;
              const bHas = b.amount != null ? 0 : 1;
              if (aHas !== bHas) return aHas - bHas;
              const ao = getCategoryPresetKey(a.name) === 'other';
              const bo = getCategoryPresetKey(b.name) === 'other';
              if (ao !== bo) return ao ? 1 : -1;
              return a.name.localeCompare(b.name, locale);
            })
            .map((c) => (
            <BudgetCard key={c.categoryId} data={c} locale={locale} onEdit={() => setEditing(c)} />
          ))}
        </div>
      </div>

      <BudgetSheet
        target={editing}
        defaultCurrency={defaultCurrency}
        onClose={() => setEditing(null)}
      />
    </>
  );
};

const BudgetCard = ({
  data,
  locale,
  featured,
  assigned,
  assignedRateMissing,
  onEdit,
}: {
  data: BudgetCardData;
  locale: Locale;
  featured?: boolean;
  assigned?: number;
  assignedRateMissing?: boolean;
  onEdit: () => void;
}) => {
  const { t } = useT();
  const Icon = iconFor(data.icon);
  const colorClass = colorStyleFor(data.color);
  const hasBudget = data.amount != null && data.amount > 0;
  // Solo en la tarjeta del total: cuánto de los topes por categoría ya asignaste.
  const showAssigned = featured && (assigned ?? 0) > 0;
  const overAssigned = showAssigned && hasBudget && (assigned as number) > (data.amount as number);

  const pct = hasBudget ? data.spent / (data.amount as number) : 0;
  const status = budgetStatus(pct);
  const remaining = hasBudget ? (data.amount as number) - data.spent : 0;

  return (
    <div className={`kumo-card p-4 ${featured ? 'p-5' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`${featured ? 'w-11 h-11' : 'w-10 h-10'} rounded-lg ${colorClass} grid place-items-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold truncate ${featured ? 'text-lg' : ''}`}>{data.name}</div>
          {hasBudget ? (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {formatMoney(data.spent, data.currency, locale)} / {formatMoney(data.amount as number, data.currency, locale)}
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500">{t.budgets.no_budget}</div>
          )}
        </div>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-500 shrink-0"
          aria-label={hasBudget ? t.common.edit : t.budgets.set}
        >
          {hasBudget ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {hasBudget && (
        <div className="mt-3 space-y-1.5">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
            <div
              className={`h-full rounded-full ${BAR_COLOR[status]} transition-all`}
              style={{ width: `${Math.min(pct, 1) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${TEXT_COLOR[status]}`}>
              {Math.round(pct * 100)}%
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {status === 'over'
                ? t.budgets.over_by.replace('{amount}', formatMoney(-remaining, data.currency, locale))
                : t.budgets.remaining.replace('{amount}', formatMoney(remaining, data.currency, locale))}
            </span>
          </div>
          {data.rateMissing && (
            <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {t.budgets.rate_missing}
            </p>
          )}
        </div>
      )}

      {showAssigned && (
        <div className={`${hasBudget ? 'mt-2' : 'mt-3'} pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs`}>
          <p className="text-slate-500 dark:text-slate-400">
            {t.budgets.assigned}:{' '}
            <span className={`font-medium ${overAssigned ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {formatMoney(assigned as number, data.currency, locale)}
            </span>
            {hasBudget && ` ${t.budgets.assigned_of.replace('{total}', formatMoney(data.amount as number, data.currency, locale))}`}
          </p>
          {overAssigned && (
            <p className="flex items-center gap-1 mt-1 text-[11px] text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3 h-3" />
              {t.budgets.assigned_exceeds}
            </p>
          )}
          {assignedRateMissing && !overAssigned && (
            <p className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {t.budgets.rate_missing}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const BudgetSheet = ({
  target,
  defaultCurrency,
  onClose,
}: {
  target: BudgetCardData | null;
  defaultCurrency: Currency;
  onClose: () => void;
}) => {
  const router = useRouter();
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [syncKey, setSyncKey] = useState<string | null>(null);

  const open = target != null;
  const key = target ? `${target.categoryId ?? 'overall'}:${target.budgetId ?? 'new'}` : null;

  // Sincroniza el form cuando se abre para un target distinto.
  if (open && key !== syncKey) {
    setSyncKey(key);
    setAmount(target!.amount != null ? String(target!.amount) : '');
    setCurrency(target!.currency ?? defaultCurrency);
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!target) return;
    const fd = new FormData();
    if (target.budgetId) fd.set('id', target.budgetId);
    if (target.categoryId) fd.set('category_id', target.categoryId);
    fd.set('amount', amount);
    fd.set('currency', currency);

    startTransition(async () => {
      const result = await upsertBudget({ ok: false }, fd);
      if (result.ok) {
        toast.success(t.budgets.saved);
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  const onRemove = () => {
    if (!target?.budgetId) return;
    startTransition(async () => {
      const result = await deleteBudget(target.budgetId as string);
      if (result.ok) {
        toast.success(t.budgets.removed);
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={target ? t.budgets.sheet_title.replace('{name}', target.name) : t.budgets.set}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t.budgets.monthly_cap}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t.budgets.currency}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          {target?.budgetId && (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="px-4 py-3 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50"
              aria-label={t.common.delete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || !amount.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
        </div>
      </form>
    </Sheet>
  );
};
