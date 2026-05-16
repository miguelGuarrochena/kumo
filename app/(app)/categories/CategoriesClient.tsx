'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Wallet, Home, ShoppingCart, Zap, Car, Heart, MoreHorizontal,
  Coffee, Plane, BookOpen, Gift, Smartphone, Utensils, Plus, Pencil, Trash2, Check,
} from 'lucide-react';
import { upsertCategory, deleteCategory } from './actions';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Database } from '@/lib/supabase/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  home: Home,
  'shopping-cart': ShoppingCart,
  zap: Zap,
  car: Car,
  heart: Heart,
  'more-horizontal': MoreHorizontal,
  coffee: Coffee,
  plane: Plane,
  'book-open': BookOpen,
  gift: Gift,
  smartphone: Smartphone,
  utensils: Utensils,
};

const ICONS = Object.keys(ICON_MAP);
const COLORS = ['sky', 'lavender', 'peach', 'mint', 'rose'] as const;

const COLOR_STYLES: Record<(typeof COLORS)[number], string> = {
  sky: 'bg-sky-100 text-sky-700',
  lavender: 'bg-lavender-100 text-lavender-500',
  peach: 'bg-peach-100 text-peach-400',
  mint: 'bg-mint-100 text-mint-500',
  rose: 'bg-rose-100 text-rose-400',
};

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const router = useRouter();

  const onDelete = async () => {
    if (!toDelete) return;
    const result = await deleteCategory(toDelete.id);
    if (result.ok) {
      toast.success(`"${toDelete.name}" eliminada`);
      router.refresh();
    } else {
      toast.error(result.error ?? 'No se pudo eliminar');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {initialCategories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onEdit={() => setEditing(cat)}
            onDelete={() => setToDelete(cat)}
          />
        ))}

        <button
          onClick={() => setCreating(true)}
          className="kumo-card p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-sky-600 active:scale-[0.98] border-dashed transition-all min-h-[68px]"
        >
          <Plus className="w-5 h-5" />
          Nueva categoría
        </button>
      </div>

      <CategorySheet
        open={!!editing || creating}
        category={editing}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDelete}
        title="Borrar categoría"
        description={`¿Borrar "${toDelete?.name}"? Los gastos asociados quedan sin categoría.`}
      />
    </>
  );
}

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = ICON_MAP[category.icon] ?? Wallet;
  const colorClass = COLOR_STYLES[category.color as (typeof COLORS)[number]] ?? COLOR_STYLES.sky;

  return (
    <div className="kumo-card p-4 flex items-center gap-3 group active:scale-[0.99] transition-transform">
      <div className={`w-10 h-10 rounded-lg ${colorClass} grid place-items-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{category.name}</div>
      </div>
      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
          aria-label="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-rose-100 active:bg-rose-200 text-rose-500"
          aria-label="Borrar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CategorySheet({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'wallet');
  const [color, setColor] = useState(category?.color ?? 'sky');

  // Sync cuando cambia la categoría editada
  if (open && category && category.name !== name && !pending) {
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
  }

  const reset = () => {
    setName('');
    setIcon('wallet');
    setColor('sky');
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    if (category?.id) fd.set('id', category.id);
    fd.set('name', name);
    fd.set('icon', icon);
    fd.set('color', color);

    startTransition(async () => {
      const result = await upsertCategory({ ok: false }, fd);
      if (result.ok) {
        toast.success(category ? 'Categoría actualizada' : 'Categoría creada');
        router.refresh();
        reset();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={category ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Streaming"
            className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            autoFocus
            required
            maxLength={40}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-11 h-11 rounded-xl ${COLOR_STYLES[c]} ${
                  color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                } grid place-items-center transition-all active:scale-90`}
                aria-label={c}
              >
                {color === c && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ícono</label>
          <div className="grid grid-cols-7 gap-2">
            {ICONS.map((iconKey) => {
              const Icon = ICON_MAP[iconKey]!;
              const active = icon === iconKey;
              return (
                <button
                  key={iconKey}
                  type="button"
                  onClick={() => setIcon(iconKey)}
                  className={`p-2.5 rounded-xl border-2 transition-colors ${
                    active
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  } active:scale-95`}
                  aria-label={iconKey}
                >
                  <Icon className="w-4 h-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Guardando...' : category ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
