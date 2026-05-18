'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, ShoppingCart, Sparkles, X, Check, Pencil } from 'lucide-react';
import { addItem, toggleBought, removeItem, clearBought, updateItem } from './actions';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';

type Item = Database['public']['Tables']['shopping_items']['Row'];

const DEFAULT_LISTS = ['Supermercado', 'Farmacia', 'Ferretería'];

const UNITS = [
  { value: '',       label: 'un.' },
  { value: 'kg',     label: 'kg' },
  { value: 'g',      label: 'g' },
  { value: 'L',      label: 'L' },
  { value: 'ml',     label: 'ml' },
  { value: 'paq.',   label: 'paq.' },
  { value: 'docena', label: 'doc.' },
] as const;

const formatQuantity = (qty: string | null, unit: string | null): string => {
  const q = (qty ?? '').trim();
  const u = (unit ?? '').trim();
  if (!q && !u) return '';
  if (!q) return u;
  if (!u || u === 'un.') return q;
  return `${q} ${u}`;
};

export const ShoppingClient = ({ initialItems }: { initialItems: Item[] }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const lists = useMemo(() => {
    const existing = new Set(initialItems.map((i) => i.list_name));
    DEFAULT_LISTS.forEach((l) => existing.add(l));
    return Array.from(existing);
  }, [initialItems]);

  const [activeList, setActiveList] = useState<string>(lists[0] ?? 'Supermercado');

  const itemsInList = initialItems.filter((i) => i.list_name === activeList);
  const pendingItems = itemsInList.filter((i) => !i.bought);
  const boughtItems = itemsInList.filter((i) => i.bought);

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
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
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
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {list}
              {count > 0 && (
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
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
          onClick={() => setCreatingList(true)}
          className="shrink-0 px-3 py-2 rounded-full text-sm font-medium text-slate-400 hover:text-slate-700 border border-dashed border-slate-300 dark:border-slate-600"
          aria-label="Nueva lista"
        >
          <Plus className="w-4 h-4" />
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
            placeholder="Ej: Verdulería"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-800"
            maxLength={40}
          />
          <button
            type="button"
            onClick={() => setCreatingList(false)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
            aria-label="Cancelar"
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

      {/* --- Quick add ---
          Fila 1: nombre + botón +.
          Fila 2: cantidad numérica + chips de unidad (un. seleccionada por default). */}
      <form
        onSubmit={onQuickAdd}
        className="kumo-card p-3 space-y-2.5 sticky top-14 lg:top-0 z-10 bg-white dark:bg-slate-800"
      >
        <div className="flex gap-2">
          <input
            ref={nameRef}
            type="text"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder="Qué necesitás..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-900"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={!quickName.trim()}
            className="w-11 p-2.5 rounded-lg kumo-gradient text-white hover:opacity-90 disabled:opacity-50 grid place-items-center shrink-0"
            aria-label="Agregar"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={quickQty}
            onChange={(e) => setQuickQty(e.target.value)}
            placeholder="1"
            min="0"
            step="any"
            className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm bg-slate-50 dark:bg-slate-900 text-center placeholder:text-slate-300 dark:placeholder:text-slate-600 shrink-0"
            aria-label="Cantidad"
          />
          <div className="flex-1 flex gap-1 overflow-x-auto -mx-1 px-1 scrollbar-none">
            {UNITS.map((u) => {
              const active = quickUnit === u.value;
              return (
                <button
                  key={u.value || 'default'}
                  type="button"
                  onClick={() => setQuickUnit(u.value)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-500/40'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {pendingItems.length === 0 && boughtItems.length === 0 ? (
        <div className="kumo-card p-10 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="font-semibold mb-1">Lista vacía</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Agregá tu primer item arriba.</p>
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
                  Ya comprado · {boughtItems.length}
                </h3>
                <button
                  onClick={onClearBought}
                  className="text-xs text-slate-500 hover:text-rose-500 font-medium"
                >
                  Limpiar
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

type ItemRowProps = {
  item: Item;
  onToggle: () => void;
  onRemove: () => void;
};

const ItemRow = ({ item, onToggle, onRemove }: ItemRowProps) => {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity ?? '');
  const [unit, setUnit] = useState(item.unit ?? '');

  useEffect(() => {
    setName(item.name);
    setQty(item.quantity ?? '');
    setUnit(item.unit ?? '');
  }, [item.id, item.name, item.quantity, item.unit]);

  const onSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    const result = await updateItem(item.id, {
      name: name.trim(),
      quantity: qty.trim() || null,
      unit: unit || null,
    });
    if (result.ok) {
      setEditing(false);
      router.refresh();
    } else {
      toast.error(result.error ?? 'Error');
    }
  };

  if (editing) {
    return (
      <div className="p-3 space-y-2.5 bg-slate-50 dark:bg-slate-700/30">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-900"
          maxLength={100}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="1"
            min="0"
            step="any"
            className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm bg-white dark:bg-slate-900 text-center placeholder:text-slate-300 dark:placeholder:text-slate-600 shrink-0"
            aria-label="Cantidad"
          />
          <div className="flex-1 flex gap-1 overflow-x-auto -mx-1 px-1 scrollbar-none">
            {UNITS.map((u) => {
              const active = unit === u.value;
              return (
                <button
                  key={u.value || 'default'}
                  type="button"
                  onClick={() => setUnit(u.value)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-500/40'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium kumo-gradient text-white hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    );
  }

  const display = formatQuantity(item.quantity, item.unit);

  return (
    <div className="flex items-center gap-3 p-3 group">
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 grid place-items-center transition-all shrink-0 ${
          item.bought
            ? 'kumo-gradient border-transparent'
            : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 active:scale-90'
        }`}
        aria-label={item.bought ? 'Marcar como pendiente' : 'Marcar como comprado'}
      >
        {item.bought && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </button>
      <button
        onClick={() => setEditing(true)}
        className="flex-1 min-w-0 text-left"
        aria-label="Editar item"
      >
        <p className={`text-sm ${item.bought ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
          {item.name}
        </p>
        {display && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{display}</p>
        )}
      </button>
      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
          aria-label="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-500"
          aria-label="Borrar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
