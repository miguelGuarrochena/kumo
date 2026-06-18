'use client';

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, ShoppingCart, Sparkles, X } from 'lucide-react';
import { addItem, toggleBought, removeItem, clearBought } from './actions';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';
import { type Item, DEFAULT_LISTS, isDefaultListName } from './constants';
import { UnitPicker } from './UnitPicker';
import { ItemRow } from './ItemRow';

export const ShoppingClient = ({ initialItems }: { initialItems: Item[] }) => {
  const router = useRouter();
  const { t } = useT();
  const [, startTransition] = useTransition();
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Optimistic state: tilde se ve al instante mientras la mutación viaja al server.
  const [optimisticItems, setOptimisticItems] = useOptimistic<Item[], { id: string; bought: boolean }>(
    initialItems,
    (state, { id, bought }) => state.map((it) => (it.id === id ? { ...it, bought } : it)),
  );

  const lists = useMemo(() => {
    const existing = new Set(optimisticItems.map((i) => i.list_name));
    DEFAULT_LISTS.forEach((l) => existing.add(l));
    return Array.from(existing);
  }, [optimisticItems]);

  const [activeList, setActiveList] = useState<string>(lists[0] ?? 'Supermercado');

  const itemsInList = optimisticItems.filter((i) => i.list_name === activeList);
  const pendingItems = itemsInList.filter((i) => !i.bought);
  const boughtItems = itemsInList.filter((i) => i.bought);
  const listLabel = (list: string) =>
    isDefaultListName(list) ? t.shopping.default_lists[list] : list;

  // --- Quick add ---
  const [quickName, setQuickName] = useState('');
  const [quickQty, setQuickQty] = useState('');
  const [quickUnit, setQuickUnit] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const onQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const fd = new FormData();
    fd.set('list_name', activeList);
    fd.set('name', quickName.trim());
    if (quickQty.trim()) fd.set('quantity', quickQty.trim());
    if (quickUnit) fd.set('unit', quickUnit);
    setQuickName('');
    setQuickQty('');
    // Mantenemos la unidad seleccionada — suele repetirse al cargar varios items en kg, L, etc.
    nameRef.current?.focus();
    startTransition(async () => {
      const result = await addItem(fd);
      if (!result.ok) {
        toast.error(result.error ?? 'Error');
        return;
      }
      track('shopping_item_added');
      router.refresh();
    });
  };

  const onToggle = (item: Item) => {
    // useOptimistic requiere estar dentro de una transition
    startTransition(async () => {
      setOptimisticItems({ id: item.id, bought: !item.bought });
      await toggleBought(item.id, !item.bought);
      router.refresh();
    });
  };

  const onRemove = async (item: Item) => {
    await removeItem(item.id);
    toast.success(t.shopping.removed);
    router.refresh();
  };

  const onClearBought = async () => {
    const result = await clearBought(activeList);
    if (result.ok) {
      toast.success(t.shopping.cleared);
      router.refresh();
    } else {
      toast.error(result.error ?? 'Error');
    }
  };

  const onCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setActiveList(newListName.trim());
    setNewListName('');
    setCreatingList(false);
    toast.success(t.shopping.list_created.replace('{name}', newListName.trim()));
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.shopping.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.shopping.subtitle}
        </p>
      </header>

      {/* Mobile: lista vertical. Desktop: chips en fila */}
      <div
        role="tablist"
        aria-label={t.shopping.lists_label}
        className="flex flex-col sm:flex-row sm:flex-wrap gap-2"
      >
        {lists.map((list) => {
          const active = list === activeList;
          const count = optimisticItems.filter((i) => i.list_name === list && !i.bought).length;
          return (
            <button
              key={list}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveList(list)}
              className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-sm font-medium transition-colors flex items-center justify-between sm:justify-center gap-2 ${
                active
                  ? 'kumo-gradient text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span>{listLabel(list)}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 rounded-full text-[10px] tabular-nums ${
                    active ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCreatingList(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-sm font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-dashed border-slate-300 dark:border-slate-600"
          aria-label={t.shopping.new_list}
        >
          <Plus className="w-4 h-4" />
          <span className="sm:hidden">{t.shopping.new_list}</span>
        </button>
      </div>

      {creatingList && (
        <form
          onSubmit={onCreateList}
          className="kumo-card p-3 flex gap-2 items-center"
        >
          <input
            autoFocus
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={t.shopping.list_placeholder}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-800"
            maxLength={40}
          />
          <button
            type="button"
            onClick={() => setCreatingList(false)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
            aria-label={t.common.cancel}
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium kumo-gradient text-white hover:opacity-90"
          >
            {t.shopping.create_list}
          </button>
        </form>
      )}

      {/* --- Quick add ---
          Mobile: 2 filas. Arriba: nombre + botón. Abajo: cantidad + UnitPicker.
          Desktop: 1 fila inline. */}
      <form
        onSubmit={onQuickAdd}
        className="kumo-card p-3 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
      >
        <input
          ref={nameRef}
          type="text"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder={t.shopping.placeholder}
          className="w-full sm:flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-900"
          maxLength={100}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={quickQty}
            onChange={(e) => setQuickQty(e.target.value)}
            placeholder="1"
            min="0"
            step="any"
            className="w-16 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-900 text-center placeholder:text-slate-300 dark:placeholder:text-slate-600 shrink-0"
            aria-label={t.shopping.quantity}
          />
          <UnitPicker value={quickUnit} onChange={setQuickUnit} align="left" />
          <button
            type="submit"
            disabled={!quickName.trim()}
            className="flex-1 sm:flex-initial sm:w-11 h-11 p-2.5 rounded-lg kumo-gradient text-white hover:opacity-90 disabled:opacity-50 grid place-items-center shrink-0 ml-auto"
            aria-label={t.common.new}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </form>

      {pendingItems.length === 0 && boughtItems.length === 0 ? (
        <div className="kumo-card p-10 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="font-semibold mb-1">{t.shopping.empty_title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.shopping.empty_desc}</p>
        </div>
      ) : (
        <>
          {pendingItems.length > 0 && (
            <div className="kumo-card divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
              {pendingItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggle(item)}
                  onRemove={() => onRemove(item)}
                />
              ))}
            </div>
          )}

          {boughtItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {t.shopping.already_bought} · {boughtItems.length}
                </h3>
                <button
                  onClick={onClearBought}
                  className="text-xs text-slate-500 hover:text-rose-500 font-medium"
                >
                  {t.shopping.clear}
                </button>
              </div>
              <div className="kumo-card divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden opacity-60">
                {boughtItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => onToggle(item)}
                    onRemove={() => onRemove(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
