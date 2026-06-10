'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { updateItem } from './actions';
import { type Item, formatQuantity } from './constants';
import { UnitPicker } from './UnitPicker';

type ItemRowProps = {
  item: Item;
  onToggle: () => void;
  onRemove: () => void;
};

export const ItemRow = ({ item, onToggle, onRemove }: ItemRowProps) => {
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
