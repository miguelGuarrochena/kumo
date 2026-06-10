'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Sparkles } from 'lucide-react';
import { upsertExpense } from './actions';
import { Sheet } from '@/components/Sheet';
import { Select, type SelectOption } from '@/components/Select';
import { useT } from '@/lib/i18n/client';
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

type ExpenseSheetProps = {
  open: boolean;
  expense: Expense | null;
  aiSuggestion?: ExtractedExpense | null;
  categories: CategoryLite[];
  contacts: ContactLite[];
  defaultCurrency: Currency;
  rates: Partial<Record<Currency, number>>;
  onClose: () => void;
};

export const ExpenseSheet = ({
  open,
  expense,
  aiSuggestion,
  categories,
  contacts,
  defaultCurrency,
  rates,
  onClose,
}: ExpenseSheetProps) => {
  const router = useRouter();
  const { t } = useT();
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

  // Split inline: toggle + state controlado pasado al SplitEditor
  const [splitOn, setSplitOn] = useState(false);
  const [splitState, setSplitState] = useState<SplitState>(emptySplitState);

  useEffect(() => {
    if (!open) return;

    if (expense) {
      // Edición de gasto existente
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
    } else if (aiSuggestion) {
      // Creación con datos extraídos del ticket
      setAmount(aiSuggestion.total ? aiSuggestion.total.toString() : '');
      const cur = (aiSuggestion.currency?.toUpperCase() ?? defaultCurrency) as Currency;
      setCurrency(CURRENCIES.some((c) => c.code === cur) ? cur : defaultCurrency);
      setDescription(aiSuggestion.description ?? aiSuggestion.merchant ?? '');
      setExpenseDate(aiSuggestion.date ?? todayKey());
      setDueDate('');
      setHasDueDate(false);
      setPaid(true);
      setIsRecurring(false);
      setRecurrenceType('monthly');
      // Intentar matchear categoría sugerida con las existentes
      const sugg = aiSuggestion.categorySuggestion?.toLowerCase().trim();
      const matched = sugg
        ? categories.find(
            (c) =>
              c.name.toLowerCase() === sugg ||
              c.name.toLowerCase().includes(sugg) ||
              sugg.includes(c.name.toLowerCase()),
          )
        : null;
      setCategoryId(matched?.id ?? '');
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
    } else {
      // Creación vacía
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
    }
    // El split de un gasto existente lo resuelve el efecto async de abajo (carga
    // desde DB). Acá solo reseteamos para creación nueva / desde ticket, así
    // evitamos el flicker false→true y la ventana donde un submit guardaría sin split.
    if (!expense) {
      setSplitOn(false);
      setSplitState(emptySplitState());
    }
    // OJO: no dependemos de `contacts`/`categories`. Si dependiéramos, un
    // `router.refresh()` (p. ej. al crear un contacto ad-hoc desde el split)
    // re-ejecutaría este efecto y borraría monto/descripción en plena edición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id, aiSuggestion, defaultCurrency]);

  // Cargar split existente cuando se edita un gasto con splits
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
        setSplitOn(true);
        setSplitState({
          mode: e2?.split_mode ?? 'equal',
          paidById: e2?.paid_by_contact_id ?? contacts.find((c) => c.is_self)?.id ?? null,
          participantIds: ids,
          values: vals,
          items: e2?.items_breakdown ?? [],
        });
      } else {
        // Gasto existente sin split: estado limpio (lo hacemos acá y no en el
        // efecto general para no provocar flicker ni perder datos en edición).
        setSplitOn(false);
        setSplitState(emptySplitState());
      }
    })();
    return () => { cancelled = true; };
    // Igual que arriba: no dependemos de `contacts` para no recargar (y pisar)
    // el split en edición cuando un `router.refresh()` actualiza la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id]);

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
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

  // Validación del split inline para bloquear el submit cuando no cuadra.
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
    // Solo mandamos contactos si hay vencimiento (sino no tiene sentido notificar)
    if (hasDueDate) {
      notifyContactIds.forEach((id) => fd.append('notify_contact_ids', id));
    }

    startTransition(async () => {
      const result = await upsertExpense({ ok: false }, fd);
      if (result.ok) {
        const expenseId = result.expenseId ?? expense?.id;
        // Si está activo el split, guardarlo también.
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
            // El user destildó la división: si había una, la borramos.
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
          track('expense_created', { currency, has_due_date: hasDueDate, via: aiSuggestion ? 'ocr' : 'manual' });
        }
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={expense ? t.expenses.edit_title : t.expenses.new}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Banner cuando vienen datos del OCR */}
        {!expense && aiSuggestion && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-br from-sky-50 to-lavender-50 dark:from-sky-900/20 dark:to-lavender-900/20 border border-sky-200 dark:border-sky-800/60">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-sky-700 dark:text-sky-300">
                Datos extraídos por IA
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Revisá monto, fecha y categoría antes de guardar.
                {aiSuggestion.merchant && (
                  <> Comercio detectado: <strong>{aiSuggestion.merchant}</strong>.</>
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
              {formatMoney(convertedAmount, defaultCurrency)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.expenses.category}</label>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: '', label: t.expenses.no_category } as SelectOption,
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            ariaLabel={t.expenses.category}
            buttonClassName="py-3 rounded-xl"
          />
        </div>

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
        {hasDueDate && contacts.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.expenses.notify_who}</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {t.expenses.notify_who_desc}
            </p>
            <div className="space-y-1.5">
              {contacts.map((c) => {
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
                  // Inicializar con modo "Partes iguales" + Yo como pagador
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
              contacts={contacts.map((c) => ({ id: c.id, name: c.name, is_self: c.is_self }))}
              state={splitState}
              setState={setSplitState}
            />
          )}
        </div>

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-white dark:bg-slate-800 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || !amount || (splitOn && !splitSumOk)}
            title={splitOn && !splitSumOk ? t.split.save_disabled_sum_no_match : undefined}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? t.common.saving : expense ? t.common.save : t.common.new}
          </button>
        </div>
      </form>
    </Sheet>
  );
};
