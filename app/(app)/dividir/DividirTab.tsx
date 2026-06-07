'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ChevronDown, Copy, MessageCircle, Plus, RotateCcw, Save, X, Loader2 } from 'lucide-react';
import { upsertExpense } from '../expenses/actions';
import { saveSplits } from '../expenses/splitsActions';
import { resizeImage } from '@/lib/image';
import { useClickOutside } from '@/lib/useClickOutside';
import { useT } from '@/lib/i18n/client';
import type { ExtractedExpense } from '@/lib/ocr/types';
import type { ContactLite } from './types';

const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN', 'CLP'];

type Mode = 'equal' | 'percentage' | 'fixed' | 'items';

type Participant = { name: string; contactId: string | null };

type ItemRow = { name: string; price: string; participantIdx: number[] };

type Props = {
  contacts: ContactLite[];
  isPro: boolean;
};

export const DividirTab = ({ contacts, isPro }: Props) => {
  const { t } = useT();
  const [total, setTotal] = useState('');
  // Propina puede ser porcentaje o monto fijo, con toggle.
  const [tipMode, setTipMode] = useState<'percent' | 'amount'>('percent');
  const [tipValue, setTipValue] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [mode, setMode] = useState<Mode>('equal');
  const [parts, setParts] = useState<Participant[]>([]);
  const [partInput, setPartInput] = useState('');
  const [values, setValues] = useState<Record<number, string>>({});
  const [items, setItems] = useState<ItemRow[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const addParticipant = (text?: string) => {
    const v = (text ?? partInput).trim();
    if (!v) return;
    const existing = contacts.find((c) => c.name.toLowerCase() === v.toLowerCase());
    setParts((p) => {
      const next = [...p, { name: existing?.name ?? v, contactId: existing?.id ?? null }];
      // Autocompletar valor del nuevo participante con el remaining para que
      // el total cierre solo. En % → 100 menos lo que ya tienen los otros.
      // En monto fijo → totalNum menos lo que ya tienen los otros.
      if (mode === 'percentage' || mode === 'fixed') {
        const cap = mode === 'percentage' ? 100 : totalNum;
        const sumOthers = p.reduce(
          (s, _, idx) => s + (parseFloat(values[idx] ?? '0') || 0),
          0,
        );
        const remaining = Math.max(0, cap - sumOthers);
        if (remaining > 0) {
          setValues((prev) => ({ ...prev, [next.length - 1]: trimNumber(remaining) }));
        }
      }
      return next;
    });
    setPartInput('');
  };

  // Cambiar de modo limpia los valores específicos del modo previo así no
  // se arrastran porcentajes cuando paso a monto fijo y viceversa.
  const changeMode = (next: Mode) => {
    setMode(next);
    setValues({});
    if (next !== 'items') setItems([]);
  };

  // En porcentaje, cuando el user edita un valor redistribuimos lo que falta
  // proporcionalmente entre los otros participantes para que sume 100. En
  // monto fijo el user es responsable de hacer cuadrar el total.
  const updateValue = (i: number, v: string) => {
    setValues((prev) => {
      const next: Record<number, string> = { ...prev, [i]: v };
      if (mode !== 'percentage') return next;
      const editedNum = parseFloat(v) || 0;
      const remaining = Math.max(0, 100 - editedNum);
      const otherIdxs = parts.map((_, idx) => idx).filter((idx) => idx !== i);
      if (otherIdxs.length === 0) return next;
      const sumOthers = otherIdxs.reduce(
        (s, idx) => s + (parseFloat(prev[idx] ?? '0') || 0),
        0,
      );
      if (sumOthers === 0) {
        const each = remaining / otherIdxs.length;
        for (const idx of otherIdxs) next[idx] = trimNumber(each);
      } else {
        const scale = remaining / sumOthers;
        for (const idx of otherIdxs) {
          const cur = parseFloat(prev[idx] ?? '0') || 0;
          next[idx] = trimNumber(cur * scale);
        }
      }
      return next;
    });
  };

  const removeParticipant = (i: number) => {
    setParts((p) => p.filter((_, idx) => idx !== i));
    setValues((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, val]) => {
        const idx = Number(k);
        if (idx < i) next[idx] = val;
        else if (idx > i) next[idx - 1] = val;
      });
      return next;
    });
    setItems((arr) =>
      arr.map((it) => ({
        ...it,
        participantIdx: it.participantIdx.filter((p) => p !== i).map((p) => (p > i ? p - 1 : p)),
      })),
    );
  };

  const baseTotal = parseFloat(total) || 0;
  const tipNum = parseFloat(tipValue) || 0;
  const tipAmount = tipMode === 'percent' ? baseTotal * (tipNum / 100) : tipNum;
  const totalNum = baseTotal + tipAmount;
  const N = parts.length;

  const computed = useMemo(() => {
    const out = new Array<number>(N).fill(0);
    if (N === 0 || totalNum === 0) return out;
    if (mode === 'equal') {
      const each = totalNum / N;
      for (let i = 0; i < N; i++) out[i] = each;
    } else if (mode === 'percentage') {
      for (let i = 0; i < N; i++) {
        const p = parseFloat(values[i] ?? '0') || 0;
        out[i] = (totalNum * p) / 100;
      }
    } else if (mode === 'fixed') {
      for (let i = 0; i < N; i++) out[i] = parseFloat(values[i] ?? '0') || 0;
    } else if (mode === 'items') {
      for (const it of items) {
        const price = parseFloat(it.price) || 0;
        if (it.participantIdx.length === 0) continue;
        const portion = price / it.participantIdx.length;
        for (const pIdx of it.participantIdx) out[pIdx] = (out[pIdx] ?? 0) + portion;
      }
    }
    return out.map((v) => Math.round(v * 100) / 100);
  }, [N, totalNum, mode, values, items]);

  const sumComputed = computed.reduce((s, v) => s + v, 0);
  const sumOk =
    mode === 'equal' ||
    (mode === 'percentage' && N > 0 && Math.abs(sumComputed - totalNum) < 0.5) ||
    (mode === 'fixed' && N > 0 && Math.abs(sumComputed - totalNum) < 0.01) ||
    (mode === 'items' && Math.abs(sumComputed - totalNum) < 0.01);

  const onScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!isPro) {
      toast.error(t.split.scan_pro_required);
      return;
    }
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
        setItems(data.items.map((it) => ({ name: it.name, price: String(it.price), participantIdx: [] })));
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
    const lines = [t.split.share_text_header.replace('{total}', formatMoney(totalNum, currency))];
    parts.forEach((p, i) => {
      lines.push(t.split.share_text_line.replace('{name}', p.name).replace('{amount}', formatMoney(computed[i] ?? 0, currency)));
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
      fd.set('expense_date', new Date().toISOString().slice(0, 10));
      fd.set('paid', 'true');
      fd.set('is_recurring', 'false');
      const r = await upsertExpense({ ok: false }, fd);
      if (!r.ok || !r.expenseId) {
        toast.error(r.error ?? 'No se pudo crear el gasto');
        return;
      }

      // Splits — solo los participantes que matchean contactos del workspace
      const splits = parts
        .map((p, i) => ({ contactId: p.contactId, amount: computed[i] ?? 0 }))
        .filter((s) => s.contactId !== null) as { contactId: string; amount: number }[];

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
      // Limpiar form
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
            .replace('{base}', formatMoney(baseTotal, currency))
            .replace('{tip}', formatMoney(tipAmount, currency))
            .replace('{pct}', String(tipNum))}
          {' = '}<strong>{formatMoney(totalNum, currency)}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={ocrLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-50"
      >
        {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {ocrLoading ? t.split.scanning_ticket : t.split.scan_ticket}
        {!isPro && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{t.split.scan_pro}</span>}
      </button>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          {t.split.participants}
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {parts.map((p, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-medium"
            >
              {p.name}{p.contactId ? '' : ' ✎'}
              <button
                type="button"
                onClick={() => removeParticipant(i)}
                aria-label="Quitar"
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
            ? t.split.mode_equal_each.replace('{amount}', formatMoney(totalNum / N, currency))
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
              .replace('{total}', formatMoney(totalNum, currency))}
          </p>
          {parts.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate flex-1">{p.name}</span>
              <div className="relative w-32">
                <input
                  type="number"
                  inputMode="decimal"
                  step={mode === 'percentage' ? '0.1' : '0.01'}
                  value={values[i] ?? ''}
                  onChange={(e) => updateValue(i, e.target.value)}
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
                ? t.split.preview_missing.replace('{amount}', formatMoney(diff, currency))
                : t.split.preview_extra.replace('{amount}', formatMoney(Math.abs(diff), currency));
              return <span className="text-[11px] text-rose-500">{label}</span>;
            })()}
          </div>
          {parts.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="truncate">{p.name}</span>
              <span className="font-semibold tabular-nums">{formatMoney(computed[i] ?? 0, currency)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <span>{t.split.preview_total}</span>
            <span className="tabular-nums">{formatMoney(sumComputed, currency)} / {formatMoney(totalNum, currency)}</span>
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

const ItemsEditor = ({
  items, setItems, parts, totalAmount,
}: {
  items: ItemRow[];
  setItems: React.Dispatch<React.SetStateAction<ItemRow[]>>;
  parts: Participant[];
  totalAmount: number;
}) => {
  const { t } = useT();
  const updateItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () => setItems((prev) => [...prev, { name: '', price: '', participantIdx: [] }]);
  const toggle = (i: number, pIdx: number) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const has = it.participantIdx.includes(pIdx);
        return {
          ...it,
          participantIdx: has ? it.participantIdx.filter((p) => p !== pIdx) : [...it.participantIdx, pIdx],
        };
      }),
    );
  };
  const itemsTotal = items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0);
  const matches = totalAmount === 0 || Math.abs(itemsTotal - totalAmount) < 0.01;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <div className="bg-sky-50/60 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-800/40 rounded-lg p-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">{t.split.items_how_to_title}</p>
        {t.split.items_how_to_body}
      </div>

      {items.length === 0 && (
        <div className="text-center py-3 text-xs text-slate-400 dark:text-slate-500 italic">
          {t.split.items_empty}
        </div>
      )}

      {items.map((it, i) => (
        <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2.5 space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                {t.split.items_item_label}
              </label>
              <input
                type="text"
                value={it.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                placeholder={t.split.items_item_placeholder}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                {t.split.items_price_label}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={it.price}
                onChange={(e) => updateItem(i, { price: e.target.value })}
                placeholder="0"
                className="w-24 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="p-1.5 text-slate-400 hover:text-rose-500 self-end"
              aria-label={t.split.items_delete}
              title={t.split.items_delete}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              {t.split.items_who_consumed}
            </p>
            <div className="flex flex-wrap gap-1">
              {parts.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">{t.split.items_add_first_participants}</span>
              ) : (
                parts.map((p, pIdx) => {
                  const on = it.participantIdx.includes(pIdx);
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => toggle(i, pIdx)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                        on
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 py-1.5 rounded-md"
      >
        <Plus className="w-3.5 h-3.5" />
        {t.split.items_add}
      </button>
      {items.length > 0 && (
        <div className={`text-xs ${matches ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500'} flex items-center justify-between`}>
          <span>{t.split.items_sum}</span>
          <span className="tabular-nums">{itemsTotal.toFixed(2)} / {totalAmount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

const formatMoney = (n: number, ccy: string): string => {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${ccy} ${n.toFixed(2)}`;
  }
};

// Redondea a 2 decimales y devuelve string sin trailing zeros
// (15.50 → "15.5", 33.333... → "33.33").
const trimNumber = (n: number): string => {
  if (!isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
};

// Dropdown simple para moneda — 5 opciones cortas, no necesita portal ni búsqueda.
const CurrencyPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, open, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base"
      >
        <span className="font-medium">{value}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                value === c ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium' : ''
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
