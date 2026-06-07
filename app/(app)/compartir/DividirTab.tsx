'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ChevronDown, Copy, MessageCircle, Plus, RotateCcw, Save, X, Loader2 } from 'lucide-react';
import { upsertExpense } from '../expenses/actions';
import { saveSplits } from '../expenses/splitsActions';
import { resizeImage } from '@/lib/image';
import { useClickOutside } from '@/lib/useClickOutside';
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
  const [total, setTotal] = useState('');
  const [tipPct, setTipPct] = useState('');
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
    setParts((p) => [...p, { name: existing?.name ?? v, contactId: existing?.id ?? null }]);
    setPartInput('');
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
  const tipNum = parseFloat(tipPct) || 0;
  const tipAmount = baseTotal * (tipNum / 100);
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
      toast.error('Escanear tickets es Pro. Suscribite desde Configuración.');
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
        toast.error(data.error ?? 'No se pudo procesar la imagen');
        return;
      }
      if (data.total) setTotal(String(data.total));
      if (data.currency) setCurrency(data.currency.toUpperCase());
      if (data.items && data.items.length > 0) {
        setItems(data.items.map((it) => ({ name: it.name, price: String(it.price), participantIdx: [] })));
        setMode('items');
      }
      toast.success('Ticket procesado');
    } catch {
      toast.error('Error al procesar la imagen');
    } finally {
      setOcrLoading(false);
    }
  };

  const buildShareText = (): string => {
    const lines = [`💵 División de la cuenta — Total: ${formatMoney(totalNum, currency)}`];
    parts.forEach((p, i) => {
      lines.push(`• ${p.name}: ${formatMoney(computed[i] ?? 0, currency)}`);
    });
    return lines.join('\n');
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const onShareWhatsApp = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const reset = () => {
    setTotal('');
    setTipPct('');
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
      toast.error('Cargá monto y participantes');
      return;
    }
    if (!sumOk) {
      toast.error('La suma no coincide con el total');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('amount', String(totalNum));
      fd.set('currency', currency);
      fd.set('description', 'Cuenta dividida');
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
      toast.success('Gasto guardado');
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
            Monto total
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
            Propina %
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={tipPct}
            onChange={(e) => setTipPct(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Moneda
          </label>
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
      </div>

      {tipNum > 0 && baseTotal > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
          Subtotal: {formatMoney(baseTotal, currency)} + propina {formatMoney(tipAmount, currency)} = <strong>{formatMoney(totalNum, currency)}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={ocrLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-500 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-50"
      >
        {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {ocrLoading ? 'Procesando ticket...' : 'O escaneá un ticket'}
        {!isPro && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Pro</span>}
      </button>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Participantes
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
            placeholder="Nombre y enter (ej: Juan, María)"
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
          Podés escribir cualquier nombre o elegir uno de tus contactos.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Modo</label>
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(['equal', 'percentage', 'fixed', 'items'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${
                mode === m
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {m === 'equal' ? 'Igual' : m === 'percentage' ? '%' : m === 'fixed' ? 'Monto' : 'Items'}
            </button>
          ))}
        </div>
      </div>

      {N > 0 && mode !== 'items' && mode !== 'equal' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
          {parts.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{p.name}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={values[i] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [i]: e.target.value }))}
                placeholder={mode === 'percentage' ? '%' : '$'}
                className="w-24 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
              />
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
            <h3 className="text-sm font-semibold">Cada uno paga</h3>
            {!sumOk && (() => {
              const diff = totalNum - sumComputed;
              const label = diff > 0
                ? `Falta ${formatMoney(diff, currency)}`
                : `Sobra ${formatMoney(Math.abs(diff), currency)}`;
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
            <span>Suma</span>
            <span className="tabular-nums">{formatMoney(sumComputed, currency)} / {formatMoney(totalNum, currency)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar
            </button>
            <button
              type="button"
              onClick={onShareWhatsApp}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-mint-200 dark:border-mint-500/30 text-mint-700 dark:text-mint-300 text-xs font-medium hover:bg-mint-50 dark:hover:bg-mint-500/10"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={onSaveAsExpense}
              disabled={saving || !sumOk}
              title={!sumOk ? 'La suma debe coincidir con el total para guardar' : 'Guardar como gasto del espacio'}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg kumo-gradient text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Asigná cada item a quien lo consumió. Si lo comparten, se divide entre ellos.
      </p>
      {items.map((it, i) => (
        <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={it.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder="Item"
              className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={it.price}
              onChange={(e) => updateItem(i, { price: e.target.value })}
              placeholder="$"
              className="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right tabular-nums"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="p-1 text-slate-400 hover:text-rose-500"
              aria-label="Borrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {parts.length === 0 && <span className="text-[11px] text-slate-400 italic">Agregá participantes primero</span>}
            {parts.map((p, pIdx) => {
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
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
      >
        + Agregar item
      </button>
      {items.length > 0 && (
        <div className={`text-xs ${matches ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500'}`}>
          Items: {itemsTotal.toFixed(2)} / Total {totalAmount.toFixed(2)}
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
