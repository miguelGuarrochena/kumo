'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Scale, ArrowRight, Trash2, Plus, X, Loader2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { recordPayment, deletePayment } from '../expenses/splitsActions';
import { CURRENCIES, formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import { localeTag } from '@/lib/i18n/locale';

export type BalanceRow = {
  contact_id: string;
  contact_name: string;
  net_amount: number;
  currency: string;
};

export type ContactLite = {
  id: string;
  name: string;
  is_self: boolean;
};

export type PaymentRow = {
  id: string;
  from_contact_id: string;
  to_contact_id: string;
  amount: number;
  currency: string;
  note: string | null;
  paid_at: string;
};

type Props = {
  balances: BalanceRow[];
  contacts: ContactLite[];
  payments: PaymentRow[];
};

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: c.label,
  hint: c.code,
}));

export const BalancesClient = ({ balances, contacts, payments }: Props) => {
  const router = useRouter();
  const { t, locale } = useT();
  const [recording, setRecording] = useState(false);
  const [pending, startTransition] = useTransition();

  const contactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? '—';

  // Agrupamos balances en owed (les debo) y owing (me deben).
  const grouped = useMemo(() => {
    const owe: BalanceRow[] = [];
    const owed: BalanceRow[] = [];
    for (const b of balances) {
      if (b.net_amount > 0) owe.push(b);
      else owed.push(b);
    }
    return { owe, owed };
  }, [balances]);

  const onDeletePayment = (id: string) => {
    startTransition(async () => {
      const r = await deletePayment(id);
      if (r.ok) { toast.success(t.split.balances_payment_deleted); router.refresh(); }
      else toast.error(r.error ?? t.common.error);
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.split.balances_page_title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {t.split.balances_page_subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRecording(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.split.balances_record_payment}</span>
        </button>
      </header>

      {balances.length === 0 ? (
        <div className="kumo-card p-8 text-center">
          <Scale className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.split.balances_empty_settled}
          </p>
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
              <ul className="space-y-2">
                {grouped.owe.map((b) => (
                  <li key={b.contact_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{b.contact_name}</span>
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatMoney(b.net_amount, b.currency as Currency, locale)}
                    </span>
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
              <ul className="space-y-2">
                {grouped.owed.map((b) => (
                  <li key={b.contact_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{b.contact_name}</span>
                    <span className="font-semibold tabular-nums text-mint-600 dark:text-mint-400 whitespace-nowrap">
                      {formatMoney(Math.abs(b.net_amount), b.currency as Currency, locale)}
                    </span>
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
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
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
      />
    </div>
  );
};

const RecordPaymentSheet = ({
  open, onClose, contacts,
}: {
  open: boolean;
  onClose: () => void;
  contacts: ContactLite[];
}) => {
  const router = useRouter();
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setFromId(''); setToId(''); setAmount(''); setCurrency('ARS'); setNote('');
    }
  }, [open]);

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
        setFromId(''); setToId(''); setAmount(''); setNote('');
        onClose();
        router.refresh();
      } else {
        toast.error(r.error ?? t.common.error);
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.split.balances_sheet_title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.split.balances_paid_label}</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
          >
            <option value="">{t.split.balances_from_placeholder}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t.split.balances_to_label}</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
          >
            <option value="">{t.split.balances_to_placeholder}</option>
            {contacts.filter((c) => c.id !== fromId).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
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
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.hint}</option>
              ))}
            </select>
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
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <X className="w-4 h-4 inline -mt-0.5" /> {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || !fromId || !toId || !amount}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t.split.balances_register}
          </button>
        </div>
      </form>
    </Sheet>
  );
};
