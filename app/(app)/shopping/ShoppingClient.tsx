'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, ShoppingCart, Sparkles, X } from 'lucide-react';
import { addItem, toggleBought, removeItem, clearBought } from './actions';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';

type Item = Database['public']['Tables']['shopping_items']['Row'];

const DEFAULT_LISTS = ['Supermercado', 'Farmacia', 'Ferretería'];

export function ShoppingClient({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [_, startTransition] = useTransition();
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Listas existentes = nombres únicos en los items + defaults
  const lists = useMemo(() => {
    const existing = new Set(initialItems.map((i) => i.list_name));
    DEFAULT_LISTS.forEach((l) => existing.add(l));
    return Array.from(existing);
  }, [initialItems]);

  // Lista activa
  const [activeList, setActiveList] = useState<string>(lists[0] ?? 'Supermercado');

  const itemsInList = initialItems.filter((i) => i.list_name === activeList);
  const pendingItems = itemsInList.filter((i) => !i.bought);
  const boughtItems = itemsInList.filter((i) => i.bought);

  // --- Quick add ---
  const [quickName, setQuickName] = useState('');
  const [quickQty, setQuickQty] = useState('');

  const onQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    const fd = new FormData();
    fd.set('list_name', activeList);
    fd.set('name', quickName.trim());
    if (quickQty.trim()) fd.set('quantity', quickQty.trim());
    setQuickName('');
    setQuickQty('');
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

  const onToggle = async (item: Item) => {
    await toggleBought(item.id, !item.bought);
    router.refresh();
  };

  const onRemove = async (item: Item) => {
    await removeItem(item.id);
    toast.success('Eliminado');
    router.refresh();
  };

  const onClearBought = async () => {
    const result = await clearBought(activeList);
    if (result.ok) {
      toast.success('Comprados limpiados');
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
    toast.success(`Lista "${newListName.trim()}" creada — agregá items`);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lista de compras</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Anotá lo que falta. Tickeá mientras estás comprando.
        </p>
      </header>

      {/* --- Tabs de listas --- */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {lists.map((list) => {
          const active = list === activeList;
          const count = initialItems.filter((i) => i.list_name === list && !i.bought).length;
          return (
            <button
              key={list}
              onClick={() => setActiveList(list)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                active
                  ? 'kumo-gradient text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {list}
              {count > 0 && (
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
                    active ? 'bg-white/25' : 'bg-slate-100'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setCreatingList(true)}
          className="shrink-0 px-3 py-2 rounded-full text-sm font-medium text-slate-400 hover:text-slate-700 border border-dashed border-slate-300"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* --- Crear nueva lista inline --- */}
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
            placeholder="Ej: Verdulería"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            maxLength={40}
          />
          <button
            type="button"
            onClick={() => setCreatingList(false)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium kumo-gradient text-white hover:opacity-90"
          >
            Crear
          </button>
        </form>
      )}

      {/* --- Quick add --- */}
      <form
        onSubmit={onQuickAdd}
        className="kumo-card p-3 flex gap-2 items-center sticky top-14 lg:top-0 z-10 bg-white"
      >
        <input
          type="text"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          placeholder="Qué necesitás..."
          className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          maxLength={100}
        />
        <input
          type="text"
          value={quickQty}
          onChange={(e) => setQuickQty(e.target.value)}
          placeholder="Cant."
          className="w-20 px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          maxLength={40}
        />
        <button
          type="submit"
          disabled={!quickName.trim()}
          className="p-2.5 rounded-lg kumo-gradient text-white hover:opacity-90 disabled:opacity-50 shrink-0"
          aria-label="Agregar"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* --- Lista de pendientes --- */}
      {pendingItems.length === 0 && boughtItems.length === 0 ? (
        <div className="kumo-card p-10 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold mb-1">Lista vacía</h3>
          <p className="text-sm text-slate-500">Agregá tu primer item arriba.</p>
        </div>
      ) : (
        <>
          {pendingItems.length > 0 && (
            <div className="kumo-card divide-y divide-slate-100 overflow-hidden">
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

          {/* --- Comprados --- */}
          {boughtItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Ya comprado · {boughtItems.length}
                </h3>
                <button
                  onClick={onClearBought}
                  className="text-xs text-slate-500 hover:text-rose-500 font-medium"
                >
                  Limpiar
                </button>
              </div>
              <div className="kumo-card divide-y divide-slate-100 overflow-hidden opacity-60">
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
}

function ItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: Item;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 group">
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 grid place-items-center transition-all shrink-0 ${
          item.bought
            ? 'kumo-gradient border-transparent'
            : 'border-slate-300 hover:border-sky-400 active:scale-90'
        }`}
        aria-label={item.bought ? 'Marcar como pendiente' : 'Marcar como comprado'}
      >
        {item.bought && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.bought ? 'line-through text-slate-400' : ''}`}>
          {item.name}
        </p>
        {item.quantity && (
          <p className="text-xs text-slate-500 mt-0.5">{item.quantity}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-2 rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-500"
        aria-label="Borrar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
