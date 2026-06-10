'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatMoney, type Currency } from '@/lib/currency';
import { useT } from '@/lib/i18n/client';
import type { ContactLite, SplitItem } from './splitTypes';

type SplitItemsEditorProps = {
  items: SplitItem[];
  setItems: (updater: (prev: SplitItem[]) => SplitItem[]) => void;
  contacts: ContactLite[];
  totalAmount: number;
  currency: Currency;
};

export const SplitItemsEditor = ({
  items,
  setItems,
  contacts,
  totalAmount,
  currency,
}: SplitItemsEditorProps) => {
  const { t } = useT();
  const updateItem = (i: number, patch: Partial<SplitItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () =>
    setItems((prev) => [...prev, { name: '', price: 0, contact_ids: [] }]);
  const toggleContact = (i: number, cid: string) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const has = it.contact_ids.includes(cid);
        return {
          ...it,
          contact_ids: has ? it.contact_ids.filter((c) => c !== cid) : [...it.contact_ids, cid],
        };
      }),
    );
  };
  const itemsTotal = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const matches = totalAmount === 0 || Math.abs(itemsTotal - totalAmount) < 0.01;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">
      <div className="bg-sky-50/60 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-800/40 rounded-lg p-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-0.5">{t.split.items_how_to_title}</p>
        {t.split.items_how_to_body}
      </div>

      {items.length === 0 && (
        <p className="text-center py-3 text-xs text-slate-400 dark:text-slate-500 italic">
          {t.split.items_empty}
        </p>
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
                value={it.price || ''}
                onChange={(e) => updateItem(i, { price: parseFloat(e.target.value) || 0 })}
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
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              {t.split.items_who_consumed}
            </p>
            <div className="flex flex-wrap gap-1">
              {contacts.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">{t.split.items_no_contacts}</span>
              ) : (
                contacts.map((c) => {
                  const on = it.contact_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(i, c.id)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${
                        on
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500'
                      }`}
                    >
                      {c.name}{c.is_self ? ` ${t.split.who_paid_self_suffix}` : ''}
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
        <div className={`text-xs flex items-center justify-between ${matches ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500'}`}>
          <span>{t.split.items_sum}</span>
          <span className="tabular-nums">
            {formatMoney(itemsTotal, currency)} / {formatMoney(totalAmount, currency)}
          </span>
        </div>
      )}
    </div>
  );
};
