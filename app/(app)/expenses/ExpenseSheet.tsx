'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Sparkles } from 'lucide-react';
import { upsertExpense } from './actions';
import { Sheet } from '@/components/Sheet';
import { Select, type SelectOption } from '@/components/Select';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName, categoryNamesMatch } from '@/lib/categoryLabels';
import type { ExtractedExpense } from '@/lib/ocr/types';
import { CURRENCIES, formatMoney, type Currency } from '@/lib/currency';
import { track } from '@/lib/analytics';
import {
  SplitEditor,
  emptySplitState,
  computeSplits,
  isSumOk,
  type SplitState,
} from './SplitEditor';
import { saveSplits } from './splitsActions';
import { todayKey } from '@/lib/date';
import type { CategoryLite, ContactLite, Expense } from './types';
import type { ContactLite as SplitContactLite } from './splitTypes';
import { toggleNotifyContactId } from '@/lib/notifyContacts';
import { WA_MAX_RECIPIENTS } from '@/lib/notifications/waLimitsClient';
import { suggestCategory } from './suggestCategoryAction';

type ExpenseSheetProps = {
  open: boolean;
  expense: Expense | null;
  aiSuggestion?: ExtractedExpense | null;
  aiSource?: 'ocr' | 'nlp' | null;
  categories: CategoryLite[];
  contacts: ContactLite[];
  defaultCurrency: Currency;
  rates: Partial<Record<Currency, number>>;
  hasWa: boolean;
  onClose: () => void;
};

export const ExpenseSheet = ({
  open,
  expense,
  aiSuggestion,
  aiSource = null,
  categories,
  contacts,
  defaultCurrency,
  rates,
  hasWa,
  onClose,
}: ExpenseSheetProps) => {
  const router = useRouter();
  const { t, locale } = useT();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayKey());
  const [dueDate, setDueDate] = useState('');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [paid, setPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>('monthly');
  const [notifyContactIds, setNotifyContactIds] = useState<string[]>([]);

  const [splitOn, setSplitOn] = useState(false);
  const [splitState, setSplitState] = useState<SplitState>(emptySplitState);
  const [extraSplitContacts, setExtraSplitContacts] = useState<SplitContactLite[]>([]);
  const [categoryManual, setCategoryManual] = useState(false);
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setExtraSplitContacts([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (expense) {
      setAmount(expense.amount?.toString() ?? '');
      setCurrency((expense.currency as Currency) ?? defaultCurrency);
      setCategoryId(expense.category_id ?? '');
      setDescription(expense.description ?? '');
      setExpenseDate(expense.expense_date ?? todayKey());
      setDueDate(expense.due_date ?? '');
      setHasDueDate(!!expense.due_date);
      setPaid(expense.paid ?? true);
      setIsRecurring(expense.is_recurring ?? false);
      setRecurrenceType(expense.recurrence_type ?? 'monthly');
      setNotifyContactIds(expense.notify_contact_ids ?? []);
      setCategoryManual(true);
    } else if (aiSuggestion) {
      setAmount(aiSuggestion.total ? aiSuggestion.total.toString() : '');
      const cur = (aiSuggestion.currency?.toUpperCase() ?? defaultCurrency) as Currency;
      setCurrency(CURRENCIES.some((c) => c.code === cur) ? cur : defaultCurrency);
      setDescription(aiSuggestion.description ?? aiSuggestion.merchant ?? '');
      setExpenseDate(aiSuggestion.date ?? todayKey());
      if (aiSuggestion.dueDate) {
        setDueDate(aiSuggestion.dueDate);
        setHasDueDate(true);
      } else {
        setDueDate('');
        setHasDueDate(false);
      }
      setPaid(true);
      setIsRecurring(false);
      setRecurrenceType('monthly');
      const sugg = aiSuggestion.categorySuggestion?.toLowerCase().trim();
      const matched = sugg
        ? categories.find((c) => categoryNamesMatch(c.name, sugg))
        : null;
      setCategoryId(matched?.id ?? '');
      setCategoryManual(!!matched?.id);
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
    } else {
      setAmount('');
      setCurrency(defaultCurrency);
      setCategoryId('');
      setDescription('');
      setExpenseDate(todayKey());
      setDueDate('');
      setHasDueDate(false);
      setPaid(true);
      setIsRecurring(false);
      setRecurrenceType('monthly');
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
      setCategoryManual(false);
    }
    setSuggestedCategoryId(null);
    if (!expense) {
      setSplitOn(false);
      setSplitState(emptySplitState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id, aiSuggestion, defaultCurrency]);

  // Auto-categorización por historial al tipear la descripción (solo gastos nuevos).
  useEffect(() => {
    if (!open || expense || aiSuggestion) return;
    const desc = description.trim();
    if (desc.length < 2) {
      setSuggestedCategoryId(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { categoryId: suggested } = await suggestCategory(desc);
      if (cancelled) return;
      setSuggestedCategoryId(suggested);
      if (suggested && !categoryManual) {
        setCategoryId(suggested);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [description, open, expense, aiSuggestion, categoryManual]);

  useEffect(() => {
    if (!open || !expense?.id) return;
    let cancelled = false;
    (async () => {
      const { createClient: createCli } = await import('@/lib/supabase/client');
      const supabase = createCli();
      const [{ data: splitRows }, { data: expenseRow }] = await Promise.all([
        supabase
          .from('expense_splits')
          .select('contact_id, amount, percentage')
          .eq('expense_id', expense.id),
        supabase
          .from('expenses')
          .select('split_mode, paid_by_contact_id, items_breakdown')
          .eq('id', expense.id)
          .single(),
      ]);
      if (cancelled) return;
      const e2 = expenseRow as {
        split_mode?: SplitState['mode'];
        paid_by_contact_id?: string | null;
        items_breakdown?: SplitState['items'] | null;
      } | null;
      const ids: string[] = [];
      const vals: Record<string, string> = {};
      type Row = { contact_id: string; amount: number | null; percentage: number | null };
      for (const s of ((splitRows ?? []) as Row[])) {
        ids.push(s.contact_id);
        if (s.percentage != null) vals[s.contact_id] = String(s.percentage);
        else if (s.amount != null) vals[s.contact_id] = String(s.amount);
      }
      const hasSplit = ids.length > 0 || !!e2?.split_mode;
      if (hasSplit) {
        const selfId = contacts.find((c) => c.is_self)?.id ?? null;
        setSplitOn(true);
        setSplitState({
          mode: e2?.split_mode ?? 'equal',
          paidById: e2?.paid_by_contact_id ?? selfId,
          participantIds: ids,
          values: vals,
          items: e2?.items_breakdown ?? [],
        });
      } else {
        setSplitOn(false);
        setSplitState(emptySplitState());
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id]);

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      toggleNotifyContactId(prev, id, {
        enforceMax: hasWa,
        max: WA_MAX_RECIPIENTS,
        onBlocked: () =>
          toast.info(
            t.calendar.wa_contacts_limit_toast.replace('{max}', String(WA_MAX_RECIPIENTS)),
          ),
      }),
    );
  };

  const convertedAmount = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || currency === defaultCurrency) return null;
    const fromRate = rates[currency];
    const toRate = rates[defaultCurrency];
    if (!fromRate || !toRate) return null;
    return (amt / fromRate) * toRate;
  }, [amount, currency, defaultCurrency, rates]);

  const splitTotalNum = parseFloat(amount) || 0;
  const splitComputed = useMemo(
    () => (splitOn ? computeSplits(splitState, splitTotalNum) : {}),
    [splitOn, splitState, splitTotalNum],
  );
  const splitSum = Object.values(splitComputed).reduce((s, v) => s + v, 0);
  const splitSumOk = !splitOn || isSumOk(splitState, splitSum, splitTotalNum);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    if (expense?.id) fd.set('id', expense.id);
    if (categoryId) fd.set('category_id', categoryId);
    fd.set('amount', amount);
    fd.set('currency', currency);
    fd.set('description', description);
    fd.set('expense_date', expenseDate);
    if (hasDueDate && dueDate) fd.set('due_date', dueDate);
    fd.set('paid', String(paid));
    fd.set('is_recurring', String(isRecurring));
    if (isRecurring) fd.set('recurrence_type', recurrenceType);
    if (hasDueDate) {
      notifyContactIds.forEach((id) => fd.append('notify_contact_ids', id));
    }

    startTransition(async () => {
      const result = await upsertExpense({ ok: false }, fd);
      if (result.ok) {
        const expenseId = result.expenseId ?? expense?.id;
        if (expenseId) {
          if (splitOn && splitState.mode) {
            const splits =
              splitState.mode === 'items'
                ? []
                : splitState.participantIds.map((cid) => {
                    const v = parseFloat(splitState.values[cid] ?? '0') || 0;
                    if (splitState.mode === 'percentage') return { contactId: cid, percentage: v };
                    if (splitState.mode === 'fixed') return { contactId: cid, amount: v };
                    return { contactId: cid };
                  });
            const sr = await saveSplits({
              expenseId,
              mode: splitState.mode,
              paidByContactId: splitState.paidById,
              splits,
              items: splitState.mode === 'items' ? splitState.items : undefined,
            });
            if (!sr.ok) toast.error(sr.error ?? 'División no guardada');
          } else if (!splitOn && expense?.id) {
            await saveSplits({
              expenseId,
              mode: null,
              paidByContactId: null,
              splits: [],
            });
          }
        }
        toast.success(expense ? t.expenses.saved_toast : t.expenses.created_toast);
        if (!expense) {
          track('expense_created', {
            currency,
            has_due_date: hasDueDate,
            via: aiSuggestion ? (aiSource ?? 'ocr') : 'manual',
          });
        }
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  const splitContacts = useMemo((): SplitContactLite[] => {
    const base: SplitContactLite[] = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      is_self: c.is_self,
      is_split_only: c.is_split_only,
    }));
    const seen = new Set(base.map((c) => c.id));
    for (const c of extraSplitContacts) {
      if (!seen.has(c.id)) {
        base.push(c);
        seen.add(c.id);
      }
    }
    return base;
  }, [contacts, extraSplitContacts]);

  const notifyContacts = contacts.filter((c) => !c.is_split_only);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? t.expenses.edit_title : t.expenses.new}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={pending || !amount || (splitOn && !splitSumOk)}
            title={splitOn && !splitSumOk ? t.split.save_disabled_sum_no_match : undefined}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? t.common.saving : expense ? t.common.save : t.common.new}
          </button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={onSubmit} className="space-y-4">
        {!expense && aiSuggestion && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-br from-sky-50 to-lavender-50 dark:from-sky-900/20 dark:to-lavender-900/20 border border-sky-200 dark:border-sky-800/60">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-sky-700 dark:text-sky-300">
                {aiSource === 'nlp' ? t.expenses.nlp_extracted_title : t.expenses.ocr_extracted_title}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                {aiSource === 'nlp' ? t.expenses.nlp_extracted_review : t.expenses.ocr_extracted_review}
                {aiSuggestion.merchant && (
                  <> {t.expenses.ocr_merchant_detected.replace('{merchant}', aiSuggestion.merchant)}</>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.expenses.amount}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t.expenses.amount_placeholder}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              autoFocus
              required
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.expenses.currency}</label>
            <Select
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
              ariaLabel={t.expenses.currency}
              buttonClassName="py-3 rounded-xl"
            />
          </div>
        </div>

        {convertedAmount !== null && (
          <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 rounded-xl p-3 text-sm flex items-center justify-between">
            <span className="text-sky-700 dark:text-sky-300">{t.expenses.equivalent}:</span>
            <span className="font-semibold text-sky-900 dark:text-sky-200">
              {formatMoney(convertedAmount, defaultCurrency, locale)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.expenses.description}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.expenses.description_placeholder}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.expenses.category}</label>
          <Select
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              setCategoryManual(true);
            }}
            options={[
              { value: '', label: t.expenses.no_category } as SelectOption,
              ...categories.map((c) => ({ value: c.id, label: categoryDisplayName(c.name, t) })),
            ]}
            ariaLabel={t.expenses.category}
            buttonClassName="py-3 rounded-xl"
          />
          {!categoryManual && suggestedCategoryId && categoryId === suggestedCategoryId && (
            <p className="mt-1.5 text-xs text-mint-600 dark:text-mint-400">{t.expenses.category_suggested}</p>
          )}
          {categoryManual && suggestedCategoryId && suggestedCategoryId !== categoryId && (
            <button
              type="button"
              onClick={() => {
                setCategoryId(suggestedCategoryId);
                setCategoryManual(false);
              }}
              className="mt-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              {t.expenses.use_suggested_category.replace(
                '{name}',
                categoryDisplayName(
                  categories.find((c) => c.id === suggestedCategoryId)?.name ?? '',
                  t,
                ),
              )}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.expenses.date}</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t.expenses.state}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-sm font-medium ${
                paid
                  ? 'border-mint-400 bg-mint-50 dark:bg-mint-500/10 text-mint-600 dark:text-mint-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Check className="w-4 h-4" />
              {t.expenses.paid}
            </button>
            <button
              type="button"
              onClick={() => setPaid(false)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-sm font-medium ${
                !paid
                  ? 'border-peach-400 bg-peach-50 dark:bg-peach-500/10 text-peach-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-peach-400" />
              {t.expenses.pending}
            </button>
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasDueDate}
              onChange={(e) => {
                setHasDueDate(e.target.checked);
                if (e.target.checked && paid) setPaid(false);
              }}
              className="rounded text-sky-600 w-4 h-4"
            />
            <span className="font-medium">{t.expenses.has_due_date}</span>
            <span className="ml-auto text-[11px] text-slate-400">{t.expenses.due_date_for_alerts}</span>
          </label>
          {hasDueDate && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          )}
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded text-sky-600 w-4 h-4"
            />
            <span className="font-medium">{t.expenses.recurring}</span>
          </label>
          {isRecurring && (
            <Select
              value={recurrenceType}
              onChange={setRecurrenceType}
              options={[
                { value: 'weekly',  label: t.expenses.recurrence_weekly },
                { value: 'monthly', label: t.expenses.recurrence_monthly },
                { value: 'yearly',  label: t.expenses.recurrence_yearly },
              ]}
              ariaLabel="Recurrence"
            />
          )}
        </div>

        {/* Selector "Avisar a" — solo aparece si hay vencimiento */}
        {hasDueDate && notifyContacts.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.expenses.notify_who}</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {hasWa
                ? t.expenses.notify_who_desc_wa.replace('{max}', String(WA_MAX_RECIPIENTS))
                : t.expenses.notify_who_desc}
            </p>
            <div className="space-y-1.5">
              {notifyContacts.map((c) => {
                const selected = notifyContactIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleContact(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                      selected
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 grid place-items-center transition-all shrink-0 ${
                        selected ? 'kumo-gradient border-transparent' : 'border-slate-300'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.phone ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">+{c.phone}</p>
                      ) : (
                        <p className="text-xs text-rose-400">Sin número — no recibirá WhatsApp</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Split inline: checkbox + editor desplegable */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={splitOn}
              onChange={(e) => {
                const on = e.target.checked;
                setSplitOn(on);
                if (on) {
                  setSplitState((s) => ({
                    ...s,
                    mode: s.mode ?? 'equal',
                    paidById: s.paidById ?? contacts.find((c) => c.is_self)?.id ?? null,
                  }));
                }
              }}
              className="rounded text-sky-600 w-4 h-4"
            />
            <span className="text-sm font-medium">{t.split.divide_this_expense}</span>
            <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
              {t.split.between_people}
            </span>
          </label>
          {splitOn && (
            <SplitEditor
              totalAmount={parseFloat(amount) || 0}
              currency={currency}
              contacts={splitContacts}
              state={splitState}
              setState={setSplitState}
              onContactCreated={(c) =>
                setExtraSplitContacts((prev) =>
                  prev.some((x) => x.id === c.id) ? prev : [...prev, c],
                )
              }
            />
          )}
        </div>
      </form>
    </Sheet>
  );
};
