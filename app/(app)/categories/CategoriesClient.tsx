'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, Home, ShoppingCart, Zap, Car, Heart, MoreHorizontal,
  Coffee, Plane, BookOpen, Gift, Smartphone, Utensils, Plus, Pencil, Trash2, Check, X,
} from 'lucide-react';
import { upsertCategory, deleteCategory } from './actions';
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
  sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
  lavender: 'bg-lavender-100 text-lavender-500 hover:bg-lavender-200',
  peach: 'bg-peach-100 text-peach-400 hover:bg-peach-200',
  mint: 'bg-mint-100 text-mint-500 hover:bg-mint-200',
  rose: 'bg-rose-100 text-rose-400 hover:bg-rose-200',
};

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {initialCategories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onEdit={() => setEditing(cat)}
          />
        ))}

        <button
          onClick={() => setCreating(true)}
          className="kumo-card p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-sky-600 hover:border-sky-300 border-dashed transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva categoría
        </button>
      </div>

      {(editing || creating) && (
        <CategoryDialog
          category={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function CategoryCard({
  category,
  onEdit,
}: {
  category: Category;
  onEdit: () => void;
}) {
  const router = useRouter();
  const Icon = ICON_MAP[category.icon] ?? Wallet;
  const colorClass = COLOR_STYLES[category.color as (typeof COLORS)[number]] ?? COLOR_STYLES.sky;

  const onDelete = async () => {
    if (!confirm(`¿Borrar la categoría "${category.name}"? Los gastos quedan sin categoría.`)) return;
    await deleteCategory(category.id);
    router.refresh();
  };

  return (
    <div className="kumo-card p-4 flex items-center gap-3 group">
      <div className={`w-10 h-10 rounded-lg ${colorClass} grid place-items-center transition-colors`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{category.name}</div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          aria-label="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-rose-100 text-rose-500"
          aria-label="Borrar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CategoryDialog({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'wallet');
  const [color, setColor] = useState(category?.color ?? 'sky');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData();
    if (category?.id) fd.set('id', category.id);
    fd.set('name', name);
    fd.set('icon', icon);
    fd.set('color', color);
    const result = await upsertCategory({ ok: false }, fd);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? 'Error');
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 grid place-items-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="kumo-card p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Streaming"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
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
                className={`w-10 h-10 rounded-lg ${COLOR_STYLES[c]} ${
                  color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                } grid place-items-center transition-all`}
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
                  className={`p-2.5 rounded-lg border-2 transition-colors ${
                    active
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  aria-label={iconKey}
                >
                  <Icon className="w-4 h-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : category ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
