'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Copy, MessageCircle, Plus, RotateCcw, Save, X, Loader2 } from 'lucide-react';
import { upsertExpense } from '../expenses/actions';
import { saveSplits } from '../expenses/splitsActions';
import { createAdHocContact } from '../settings/contactsActions';
import { resizeImage } from '@/lib/image';
import { todayKey } from '@/lib/date';
import { useT } from '@/lib/i18n/client';
import type { ExtractedExpense } from '@/lib/ocr/types';
import type { ContactLite } from './types';
import type { Mode, Participant, ItemRow } from './dividirTypes';
import { formatMoney, trimNumber, newId } from './dividirUtils';
import { CurrencyPicker } from './CurrencyPicker';
import { ItemsEditor } from './ItemsEditor';
import { OcrPaywallSheet } from '@/components/OcrPaywallSheet';

type Props = {
  contacts: ContactLite[];
  hasOcrAccess: boolean;
  trialDaysLeft: number | null;
  priceMonthly: string;
  priceYearly: string;
  yearlyPct: number;
};

export const DividirTab = ({
  contacts,
  hasOcrAccess,
  trialDaysLeft,
  priceMonthly,
  priceYearly,
  yearlyPct,
}: Props) => {
  const { t, locale } = useT();
  const [total, setTotal] = useState('');
  const [tipMode, setTipMode] = useState<'percent' | 'amount'>('percent');
  const [tipValue, setTipValue] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [mode, setMode] = useState<Mode>('equal');
  const [parts, setParts] = useState<Participant[]>([]);
  const [partInput, setPartInput] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ItemRow[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPaywallOpen, setOcrPaywallOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const addParticipant = (text?: string) => {
    const v = (text ?? partInput).trim();
    if (!v) return;
    const existing = contacts.find((c) => c.name.toLowerCase() === v.toLowerCase());
    const id = newId();
    setParts((p) => [...p, { id, name: existing?.name ?? v, contactId: existing?.id ?? null }]);
    if (mode === 'percentage' || mode === 'fixed') {
      const cap = mode === 'percentage' ? 100 : totalNum;
      const sumOthers = parts.reduce(
        (s, p) => s + (parseFloat(values[p.id] ?? '0') || 0),
        0,
      );
      const remaining = Math.max(0, cap - sumOthers);
      if (remaining > 0) {
        setValues((prev) => ({ ...prev, [id]: trimNumber(remaining) }));
      }
    }
    setPartInput('');
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setValues({});
    if (next !== 'items') setItems([]);
  };

  const updateValue = (id: string, v: string) => {
    setValues((prev) => {
      const next: Record<string, string> = { ...prev, [id]: v };
      if (mode !== 'percentage') return next;
      const editedNum = parseFloat(v) || 0;
      const remaining = Math.max(0, 100 - editedNum);
      const otherIds = parts.map((p) => p.id).filter((pid) => pid !== id);
      if (otherIds.length === 0) return next;
      const sumOthers = otherIds.reduce(
        (s, pid) => s + (parseFloat(prev[pid] ?? '0') || 0),
        0,
      );
      if (sumOthers === 0) {
        const each = remaining / otherIds.length;
        for (const pid of otherIds) next[pid] = trimNumber(each);
      } else {
        const scale = remaining / sumOthers;
        for (const pid of otherIds) {
          const cur = parseFloat(prev[pid] ?? '0') || 0;
          next[pid] = trimNumber(cur * scale);
        }
      }
      return next;
    });
  };

  const removeParticipant = (id: string) => {
    setParts((p) => p.filter((part) => part.id !== id));
    setValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setItems((arr) =>
      arr.map((it) => ({
        ...it,
        participantIds: it.participantIds.filter((pid) => pid !== id),
      })),
    );
  };

  const baseTotal = parseFloat(total) || 0;
  const tipNum = parseFloat(tipValue) || 0;
  const tipAmount = tipMode === 'percent' ? baseTotal * (tipNum / 100) : tipNum;
  const totalNum = baseTotal + tipAmount;
  const N = parts.length;

  const computed = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of parts) out[p.id] = 0;
    if (N === 0 || totalNum === 0) return out;
    if (mode === 'equal') {
      const each = totalNum / N;
      for (const p of parts) out[p.id] = each;
    } else if (mode === 'percentage') {
      for (const p of parts) {
        const pct = parseFloat(values[p.id] ?? '0') || 0;
        out[p.id] = (totalNum * pct) / 100;
      }
    } else if (mode === 'fixed') {
      for (const p of parts) out[p.id] = parseFloat(values[p.id] ?? '0') || 0;
    } else if (mode === 'items') {
      for (const it of items) {
        const price = parseFloat(it.price) || 0;
        if (it.participantIds.length === 0) continue;
        const portion = price / it.participantIds.length;
        for (const pid of it.participantIds) {
          if (pid in out) out[pid] = (out[pid] ?? 0) + portion;
        }
      }
    }
    for (const k of Object.keys(out)) out[k] = Math.round((out[k] ?? 0) * 100) / 100;
    return out;
  }, [parts, N, totalNum, mode, values, items]);

  const sumComputed = parts.reduce((s, p) => s + (computed[p.id] ?? 0), 0);
  const sumOk =
    mode === 'equal' ||
    (mode === 'percentage' && N > 0 && Math.abs(sumComputed - totalNum) < 0.5) ||
    (mode === 'fixed' && N > 0 && Math.abs(sumComputed - totalNum) < 0.01) ||
    (mode === 'items' && Math.abs(sumComputed - totalNum) < 0.01);

  const onScanClick = () => {
    if (!hasOcrAccess) {
      setOcrPaywallOpen(true);
      return;
    }
    fileRef.current?.click();
  };

  const onScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setOcrLoading(true);
    try {
      const compressed = await resizeImage(file);
      const fd = new FormData();
      fd.set('image', compressed, 'ticket.jpg');
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data: ExtractedExpense & { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t.split.ticket_failed);
        return;
      }
      if (data.total) setTotal(String(data.total));
      if (data.currency) setCurrency(data.currency.toUpperCase());
      if (data.items && data.items.length > 0) {
        setItems(data.items.map((it) => ({ id: newId(), name: it.name, price: String(it.price), participantIds: [] })));
        setMode('items');
      }
      toast.success(t.split.ticket_processed);
    } catch {
      toast.error(t.split.ticket_error);
    } finally {
      setOcrLoading(false);
    }
  };

  const buildShareText = (): string => {
    const lines = [t.split.share_text_header.replace('{total}', formatMoney(totalNum, currency, locale))];
    parts.forEach((p) => {
      lines.push(t.split.share_text_line.replace('{name}', p.name).replace('{amount}', formatMoney(computed[p.id] ?? 0, currency, locale)));
    });
    return lines.join('\n');
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      toast.success(t.split.copied);
    } catch {
      toast.error(t.split.copy_failed);
    }
  };

  const onShareWhatsApp = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const reset = () => {
    setTotal('');
    setTipValue('');
    setTipMode('percent');
    setCurrency('ARS');
    setMode('equal');
    setParts([]);
    setPartInput('');
    setValues({});
    setItems([]);
  };

  const [saving, setSaving] = useState(false);
  const onSaveAsExpense = async () => {
    if (totalNum === 0 || N === 0) {
      toast.error(t.split.missing_data);
      return;
    }
    if (!sumOk) {
      toast.error(t.split.sum_mismatch);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('amount', String(totalNum));
      fd.set('currency', currency);
      fd.set('description', t.split.default_description);
      fd.set('expense_date', todayKey());
      fd.set('paid', 'true');
      fd.set('is_recurring', 'false');
      const r = await upsertExpense({ ok: false }, fd);
      if (!r.ok || !r.expenseId) {
        toast.error(r.error ?? t.common.error);
        return;
      }

      const splits: { contactId: string; amount: number }[] = [];
      for (const p of parts) {
        const amount = computed[p.id] ?? 0;
        let contactId = p.contactId;
        if (!contactId) {
          const name = p.name.trim();
          if (!name) continue;
          const created = await createAdHocContact(name);
          if (!created.ok || !created.id) {
            toast.error(created.error ?? t.common.error);
            continue;
          }
          contactId = created.id;
        }
        splits.push({ contactId, amount });
      }

      if (splits.length > 0) {
        const selfContact = contacts.find((c) => c.is_self);
        await saveSplits({
          expenseId: r.expenseId,
          mode: 'fixed',
          paidByContactId: selfContact?.id ?? null,
          splits,
        });
      }
      toast.success(t.split.expense_saved);
      setTotal(''); setParts([]); setValues({}); setItems([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onScan}
        className="hidden"
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t.split.amount_total}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg font-medium tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t.split.tip}
          </label>
          <div className="flex items-stretch gap-1">
            <input
              type="number"
              inputMode="decimal"
              step={tipMode === 'percent' ? '0.1' : '0.01'}
              value={tipValue}
              onChange={(e) => setTipValue(e.target.value)}
              placeholder={tipMode === 'percent' ? '10' : '0'}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base tabular-nums"
            />
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setTipMode('percent')}
                aria-pressed={tipMode === 'percent'}
                aria-label={t.split.tip_pct_aria}
                className={`px-3 rounded-md ${
                  tipMode === 'percent'
                    ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setTipMode('amount')}
                aria-pressed={tipMode === 'amount'}
                aria-label={t.split.tip_amount_aria}
                className={`px-3 rounded-md ${
                  tipMode === 'amount'
                    ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                $
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t.expenses.currency}
          </label>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
      </div>

      {tipAmount > 0 && baseTotal > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
          {(tipMode === 'percent' ? t.split.subtotal_breakdown_pct : t.split.subtotal_breakdown)
            .replace('{base}', formatMoney(baseTotal, currency, locale))
            .replace('{tip}', formatMoney(tipAmount, currency, locale))
            .replace('{pct}', String(tipNum))}
          {' = '}<strong>{formatMoney(totalNum, currency, locale)}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={onScanClick}
        disabled={ocrLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-50"
      >
        {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {ocrLoading ? t.split.scanning_ticket : t.split.scan_ticket}
        {!hasOcrAccess && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            {t.ocr.badge_paid}
          </span>
        )}
      </button>

      <OcrPaywallSheet
        open={ocrPaywallOpen}
        onClose={() => setOcrPaywallOpen(false)}
        priceMonthly={priceMonthly}
        priceYearly={priceYearly}
        yearlyPct={yearlyPct}
        trialDaysLeft={trialDaysLeft}
      />

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          {t.split.participants}
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {parts.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-medium"
            >
              {p.name}{p.contactId ? '' : ' ✎'}
              <button
                type="button"
                onClick={() => removeParticipant(p.id)}
                aria-label={t.split.participants_remove}
                className="hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            list="contacts-list"
            value={partInput}
            onChange={(e) => setPartInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addParticipant();
              }
            }}
            placeholder={t.split.participants_placeholder}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
          <datalist id="contacts-list">
            {contacts.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => addParticipant()}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {t.split.participants_hint}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t.split.mode}</label>
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {([
            { v: 'equal' as const,      label: t.split.mode_equal },
            { v: 'percentage' as const, label: t.split.mode_percentage },
            { v: 'fixed' as const,      label: t.split.mode_fixed },
            { v: 'items' as const,      label: t.split.mode_items },
          ]).map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => changeMode(m.v)}
              className={`px-1.5 py-1.5 rounded text-[11px] sm:text-xs font-medium text-center leading-tight ${
                mode === m.v
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          {mode === 'equal' && N > 0 && totalNum > 0
            ? t.split.mode_equal_each.replace('{amount}', formatMoney(totalNum / N, currency, locale))
            : mode === 'equal'      ? t.split.mode_equal_hint
            : mode === 'percentage' ? t.split.mode_percentage_hint
            : mode === 'fixed'      ? t.split.mode_fixed_hint
            : t.split.mode_items_hint}
        </p>
      </div>

      {N > 0 && mode !== 'items' && mode !== 'equal' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {(mode === 'percentage' ? t.split.values_pct_helper : t.split.values_fixed_helper)
              .replace('{total}', formatMoney(totalNum, currency, locale))}
          </p>
          {parts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate flex-1">{p.name}</span>
              <div className="relative w-32">
                <input
                  type="number"
                  inputMode="decimal"
                  step={mode === 'percentage' ? '0.1' : '0.01'}
                  value={values[p.id] ?? ''}
                  onChange={(e) => updateValue(p.id, e.target.value)}
                  placeholder="0"
                  className="w-full pl-3 pr-10 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  {mode === 'percentage' ? '%' : currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'items' && (
        <ItemsEditor
          items={items}
          setItems={setItems}
          parts={parts}
          totalAmount={totalNum}
        />
      )}

      {N > 0 && totalNum > 0 && (
        <div className="kumo-card p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t.split.preview_each_pays}</h3>
            {!sumOk && (() => {
              const diff = totalNum - sumComputed;
              const label = diff > 0
                ? t.split.preview_missing.replace('{amount}', formatMoney(diff, currency, locale))
                : t.split.preview_extra.replace('{amount}', formatMoney(Math.abs(diff), currency, locale));
              return <span className="text-[11px] text-rose-500">{label}</span>;
            })()}
          </div>
          {parts.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{p.name}</span>
              <span className="font-semibold tabular-nums">{formatMoney(computed[p.id] ?? 0, currency, locale)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <span>{t.split.preview_total}</span>
            <span className="tabular-nums">{formatMoney(sumComputed, currency, locale)} / {formatMoney(totalNum, currency, locale)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Copy className="w-3.5 h-3.5" />
              {t.split.copy}
            </button>
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-mint-200 dark:border-mint-500/30 text-mint-700 dark:text-mint-300 text-xs font-medium hover:bg-mint-50 dark:hover:bg-mint-500/10"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {t.split.whatsapp}
            </button>
            <button
              type="button"
              onClick={onSaveAsExpense}
              disabled={saving || !sumOk}
              title={!sumOk ? t.split.save_disabled_sum : t.split.save_as_expense_title}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg kumo-gradient text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t.split.save_as_expense}
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.split.reset}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
