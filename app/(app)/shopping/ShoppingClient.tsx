'use client';

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, ShoppingCart, Sparkles, X, Check, Pencil, ChevronDown } from 'lucide-react';
import { addItem, toggleBought, removeItem, clearBought, updateItem } from './actions';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';

type Item = Database['public']['Tables']['shopping_items']['Row'];

const DEFAULT_LISTS = ['Supermercado', 'Farmacia', 'Ferretería'];

const UNITS = [
  { value: '',       label: 'un.',  full: 'Unidad' },
  { value: 'kg',     label: 'kg',   full: 'Kilos' },
  { value: 'g',      label: 'g',    full: 'Gramos' },
  { value: 'L',      label: 'L',    full: 'Litros' },
  { value: 'ml',     label: 'ml',   full: 'Mililitros' },
  { value: 'paq.',   label: 'paq.', full: 'Paquete' },
  { value: 'docena', label: 'doc.', full: 'Docena' },
] as const;

type UnitPickerProps = {
  value: string;
  onChange: (v: string) => void;
  align?: 'left' | 'right';
};

const UnitPicker = ({ value, onChange, align = 'left' }: UnitPickerProps) => {
  const [open, setOpen] = useState(false);
  const current = UNITS.find((u) => u.value === value) ?? UNITS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[5rem] justify-between ${
          open
            ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            className={`absolute z-50 top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[10rem] overflow-hidden`}
          >
            {UNITS.map((u) => {
              const active = u.value === value;
              return (
                <button
                  key={u.value || 'default'}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(u.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-8 text-center font-medium">{u.label}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs">{u.full}</span>
                  </span>
                  {active && <Check className="w-4 h-4 text-sky-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

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
    toast.success(`Lista "${newListName.trim()}" creada`);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.shopping.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.shopping.subtitle}
        </p>
      </header>

      {/* --- Tabs de listas --- */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {lists.map((list) => {
          const active = list === activeList;
          const count = optimisticItems.filter((i) => i.list_name === list && !i.bought).length;
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
        className="kumo-card p-3 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-2 sticky top-14 lg:top-0 z-10 bg-white dark:bg-slate-800"
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
            className="w-16 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white dark:bg-slate-900 text-center placeholder:text-slate-300 dark:placeholder:text-slate-600 shrink-0"
            aria-label="Cantidad"
          />
          <UnitPicker value={unit} onChange={setUnit} align="left" />
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
      {/* Toda la fila (checkbox + nombre + cant) tachea / destachea al tocar */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
        aria-label={item.bought ? 'Marcar como pendiente' : 'Marcar como comprado'}
      >
        <span
          className={`w-6 h-6 rounded-full border-2 grid place-items-center shrink-0 transition-all ${
            item.bought
              ? 'kumo-gradient border-transparent'
              : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          {item.bought && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm ${item.bought ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
            {item.name}
          </span>
          {display && (
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{display}</span>
          )}
        </span>
      </button>
      <div className="flex gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
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
