'use client';

import { Plus, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import type { ItemRow, Participant } from './dividirTypes';
import { newId } from './dividirUtils';

type ItemsEditorProps = {
  items: ItemRow[];
  setItems: React.Dispatch<React.SetStateAction<ItemRow[]>>;
  parts: Participant[];
  totalAmount: number;
};

export const ItemsEditor = ({ items, setItems, parts, totalAmount }: ItemsEditorProps) => {
  const { t } = useT();
  const updateItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () => setItems((prev) => [...prev, { id: newId(), name: '', price: '', participantIds: [] }]);
  const toggle = (i: number, pid: string) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const has = it.participantIds.includes(pid);
        return {
          ...it,
          participantIds: has ? it.participantIds.filter((p) => p !== pid) : [...it.participantIds, pid],
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
        <div key={it.id} className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2.5 space-y-2">
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
                parts.map((p) => {
                  const on = it.participantIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(i, p.id)}
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
