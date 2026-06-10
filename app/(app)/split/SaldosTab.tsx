'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Scale, ArrowRight, Trash2, Plus, Loader2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { recordPayment, deletePayment } from '../expenses/splitsActions';
import { CURRENCIES, formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { localeTag } from '@/lib/i18n/locale';
import type { BalanceRow, ContactLite, PaymentRow } from './types';

type PaymentDraft = {
  fromId?: string;
  toId?: string;
  amount?: string;
};

type Props = {
  balances: BalanceRow[];
  contacts: ContactLite[];
  payments: PaymentRow[];
};

export const SaldosTab = ({ balances, contacts, payments }: Props) => {
  const router = useRouter();
  const { t, locale } = useT();
  const [recording, setRecording] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({});
  const [pending, startTransition] = useTransition();

  const contactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? '—';

  const grouped = useMemo(() => {
    const owe: BalanceRow[] = [];
    const owed: BalanceRow[] = [];
    for (const b of balances) {
      if (b.net_amount > 0) owe.push(b);
      else owed.push(b);
    }
    return { owe, owed };
  }, [balances]);

  const openPayment = (draft: PaymentDraft = {}) => {
    setPaymentDraft(draft);
    setRecording(true);
  };

  const onDeletePayment = (id: string) => {
    startTransition(async () => {
      const r = await deletePayment(id);
      if (r.ok) { toast.success(t.split.balances_payment_deleted); router.refresh(); }
      else toast.error(r.error ?? t.common.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => openPayment()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          {t.split.balances_record_payment}
        </button>
      </div>

      {balances.length === 0 ? (
        <div className="kumo-card p-8 text-center space-y-3">
          <Scale className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <div>
            <p className="text-sm font-medium">{t.split.balances_no_debts}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              {t.split.balances_empty_desc}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="kumo-card p-4">
            <h3 className="font-semibold text-sm mb-3 text-rose-600 dark:text-rose-400">
              {t.split.balances_owe_title}
            </h3>
            {grouped.owe.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">{t.split.balances_nobody_owes}</p>
            ) : (
              <ul className="space-y-1.5">
                {grouped.owe.map((b) => (
                  <li key={b.contact_id}>
                    <button
                      type="button"
                      onClick={() => openPayment({
                        fromId: b.contact_id,
                        amount: String(b.net_amount),
                      })}
                      className="w-full flex items-center justify-between gap-3 text-sm px-2 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <span className="truncate font-medium">{b.contact_name}</span>
                      <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatMoney(b.net_amount, b.currency as Currency, locale)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="kumo-card p-4">
            <h3 className="font-semibold text-sm mb-3 text-mint-600 dark:text-mint-400">
              {t.split.balances_owed_title}
            </h3>
            {grouped.owed.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">{t.split.balances_nobody_owed}</p>
            ) : (
              <ul className="space-y-1.5">
                {grouped.owed.map((b) => (
                  <li key={b.contact_id}>
                    <button
                      type="button"
                      onClick={() => openPayment({
                        toId: b.contact_id,
                        amount: String(Math.abs(b.net_amount)),
                      })}
                      className="w-full flex items-center justify-between gap-3 text-sm px-2 py-2 rounded-lg hover:bg-mint-50 dark:hover:bg-mint-500/10 transition-colors text-left"
                    >
                      <span className="truncate font-medium">{b.contact_name}</span>
                      <span className="font-semibold tabular-nums text-mint-600 dark:text-mint-400 whitespace-nowrap">
                        {formatMoney(Math.abs(b.net_amount), b.currency as Currency, locale)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div className="kumo-card p-4">
          <h3 className="font-semibold text-sm mb-3">{t.split.balances_recent_payments}</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 text-sm">
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate">{contactName(p.from_contact_id)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{contactName(p.to_contact_id)}</span>
                </span>
                <span className="font-medium tabular-nums whitespace-nowrap">
                  {formatMoney(Number(p.amount), p.currency as Currency, locale)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:inline">
                  {new Date(p.paid_at).toLocaleDateString(localeTag(locale))}
                </span>
                <button
                  type="button"
                  onClick={() => onDeletePayment(p.id)}
                  disabled={pending}
                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  aria-label={t.split.balances_delete_payment}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RecordPaymentSheet
        open={recording}
        onClose={() => setRecording(false)}
        contacts={contacts}
        balances={balances}
        initialFrom={paymentDraft.fromId}
        initialTo={paymentDraft.toId}
        initialAmount={paymentDraft.amount}
      />
    </div>
  );
};

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: c.label,
  hint: c.code,
}));

const RecordPaymentSheet = ({
  open,
  onClose,
  contacts,
  balances,
  initialFrom,
  initialTo,
  initialAmount,
}: {
  open: boolean;
  onClose: () => void;
  contacts: ContactLite[];
  balances: BalanceRow[];
  initialFrom?: string;
  initialTo?: string;
  initialAmount?: string;
}) => {
  const router = useRouter();
  const { t, locale } = useT();
  const [pending, startTransition] = useTransition();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [note, setNote] = useState('');

  const debtors = useMemo(
    () => balances.filter((b) => b.net_amount > 0),
    [balances],
  );
  const creditors = useMemo(
    () => balances.filter((b) => b.net_amount < 0),
    [balances],
  );

  const contactLabel = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    if (c) return c.name + (c.is_self ? ` ${t.split.who_paid_self_suffix}` : '');
    return balances.find((b) => b.contact_id === id)?.contact_name ?? '—';
  };

  useEffect(() => {
    if (!open) return;
    setFromId(initialFrom ?? '');
    setToId(initialTo ?? '');
    setAmount(initialAmount ?? '');
    const cur =
      balances.find((b) => b.contact_id === (initialFrom ?? initialTo))?.currency ?? 'ARS';
    setCurrency(cur);
    setNote('');
  }, [open, initialFrom, initialTo, initialAmount, balances]);

  const pickFrom = (id: string, amt?: number, cur?: string) => {
    setFromId(id);
    if (amt != null && amt > 0) setAmount(String(amt));
    if (cur) setCurrency(cur);
    if (toId === id) setToId('');
  };

  const pickTo = (id: string, amt?: number, cur?: string) => {
    setToId(id);
    if (amt != null && amt > 0) setAmount(String(amt));
    if (cur) setCurrency(cur);
    if (fromId === id) setFromId('');
  };

  const otherContacts = contacts.filter(
    (c) => !debtors.some((d) => d.contact_id === c.id) && !creditors.some((d) => d.contact_id === c.id),
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!fromId || !toId || !amt) return;
    startTransition(async () => {
      const r = await recordPayment({
        fromContactId: fromId,
        toContactId: toId,
        amount: amt,
        currency,
        note: note || undefined,
      });
      if (r.ok) {
        toast.success(t.split.balances_payment_recorded);
        onClose();
        router.refresh();
      } else {
        toast.error(r.error ?? t.common.error);
      }
    });
  };

  const footer = (
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
        form="record-payment-form"
        disabled={pending || !fromId || !toId || !amount}
        className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t.split.balances_register}
      </button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={t.split.balances_sheet_title} footer={footer}>
      <form id="record-payment-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">{t.split.balances_paid_label}</label>
          {debtors.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.split.balances_pick_debtor}</p>
              <div className="flex flex-wrap gap-1.5">
                {debtors.map((b) => (
                  <button
                    key={b.contact_id}
                    type="button"
                    onClick={() => pickFrom(b.contact_id, b.net_amount, b.currency)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      fromId === b.contact_id
                        ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-rose-300'
                    }`}
                  >
                    {b.contact_name}
                    <span className="opacity-70 ml-1 tabular-nums">
                      {formatMoney(b.net_amount, b.currency as Currency, locale)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">{t.split.balances_no_debtors_pick}</p>
          )}
          {(otherContacts.length > 0 || contacts.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(otherContacts.length > 0 ? otherContacts : contacts)
                .filter((c) => !debtors.some((d) => d.contact_id === c.id))
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickFrom(c.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      fromId === c.id
                        ? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300'
                    }`}
                  >
                    {c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
                  </button>
                ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t.split.balances_to_label}</label>
          {creditors.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.split.balances_pick_creditor}</p>
              <div className="flex flex-wrap gap-1.5">
                {creditors.map((b) => (
                  <button
                    key={b.contact_id}
                    type="button"
                    onClick={() => pickTo(b.contact_id, Math.abs(b.net_amount), b.currency)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      toId === b.contact_id
                        ? 'border-mint-400 bg-mint-50 text-mint-700 dark:bg-mint-500/20 dark:text-mint-300 dark:border-mint-500/40'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-mint-300'
                    }`}
                  >
                    {b.contact_name}
                    <span className="opacity-70 ml-1 tabular-nums">
                      {formatMoney(Math.abs(b.net_amount), b.currency as Currency, locale)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">{t.split.balances_no_creditors_pick}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {contacts
              .filter((c) => !creditors.some((d) => d.contact_id === c.id) || creditors.length === 0)
              .filter((c) => c.id !== fromId)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickTo(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    toId === c.id
                      ? 'border-mint-400 bg-mint-50 text-mint-700 dark:bg-mint-500/20 dark:text-mint-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-mint-300'
                  }`}
                >
                  {c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
                </button>
              ))}
          </div>
        </div>

        {(fromId || toId) && (
          <p className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80">
            {fromId && toId
              ? `${contactLabel(fromId)} → ${contactLabel(toId)}`
              : fromId
                ? `${t.split.balances_paid_label}: ${contactLabel(fromId)}`
                : `${t.split.balances_to_label}: ${contactLabel(toId)}`}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">{t.split.balances_amount}</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.expenses.currency}</label>
            <Select
              value={currency}
              onChange={setCurrency}
              options={CURRENCY_OPTIONS}
              ariaLabel={t.expenses.currency}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.split.balances_note_optional}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.split.balances_note_placeholder}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
          />
        </div>
      </form>
    </Sheet>
  );
};
