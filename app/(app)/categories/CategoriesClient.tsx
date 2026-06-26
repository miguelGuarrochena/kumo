'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Wallet, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { upsertCategory, deleteCategory } from './actions';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName, getCategoryPresetKey } from '@/lib/categoryLabels';
import { ICON_MAP, ICON_KEYS as ICONS, CATEGORY_COLORS as COLORS, COLOR_STYLES } from '@/lib/categoryVisuals';

type Category = Database['public']['Tables']['categories']['Row'];

export const CategoriesClient = ({ initialCategories }: { initialCategories: Category[] }) => {
  const { t, locale } = useT();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense');
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const router = useRouter();

  const onDelete = async () => {
    if (!toDelete) return;
    const result = await deleteCategory(toDelete.id);
    if (result.ok) {
      toast.success(`Categoría "${toDelete.name}" eliminada`);
      router.refresh();
    } else {
      toast.error(result.error ?? 'Error');
    }
  };

  const visible = initialCategories
    .filter((c) => ((c.kind as 'expense' | 'income' | undefined) ?? 'expense') === activeKind)
    .sort((a, b) => {
      // "Otros" siempre al final; el resto, alfabético en el idioma actual.
      const ao = getCategoryPresetKey(a.name) === 'other';
      const bo = getCategoryPresetKey(b.name) === 'other';
      if (ao !== bo) return ao ? 1 : -1;
      return categoryDisplayName(a.name, t).localeCompare(categoryDisplayName(b.name, t), locale);
    });

  return (
    <>
      {/* Tabs Gastos / Ingresos */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
        {(['expense', 'income'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActiveKind(k)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeKind === k
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {k === 'expense' ? t.categories.kind_expense : t.categories.kind_income}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((cat) => (
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
          {activeKind === 'income' ? t.categories.new_income : t.categories.new}
        </button>
      </div>

      <CategorySheet
        open={!!editing || creating}
        category={editing}
        defaultKind={activeKind}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDelete}
        title={t.categories.delete_confirm_title}
        description={t.categories.delete_confirm.replace('{name}', toDelete ? categoryDisplayName(toDelete.name, t) : '')}
      />
    </>
  );
};

const CategoryCard = ({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { t } = useT();
  const Icon = ICON_MAP[category.icon] ?? Wallet;
  const colorClass = COLOR_STYLES[category.color as (typeof COLORS)[number]] ?? COLOR_STYLES.sky;

  return (
    <div className="kumo-card p-4 flex items-center gap-3 group active:scale-[0.99] transition-transform">
      <div className={`w-10 h-10 rounded-lg ${colorClass} grid place-items-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{categoryDisplayName(category.name, t)}</div>
      </div>
      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 text-slate-500"
          aria-label={t.common.edit}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 active:bg-rose-200 text-rose-500"
          aria-label={t.common.delete}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const CategorySheet = ({
  open,
  category,
  defaultKind,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  defaultKind: 'expense' | 'income';
  onClose: () => void;
}) => {
  const router = useRouter();
  const { t } = useT();
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
    fd.set('kind', (category?.kind as 'expense' | 'income' | undefined) ?? defaultKind);

    startTransition(async () => {
      const result = await upsertCategory({ ok: false }, fd);
      if (result.ok) {
        toast.success(category ? 'Categoría actualizada' : 'Categoría creada');
        if (!category) {
          track('category_created', { color });
        }
        router.refresh();
        reset();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={category ? t.categories.edit : t.categories.new}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.categories.name}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.categories.name_placeholder}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            autoFocus
            required
            maxLength={40}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.categories.color}</label>
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`aspect-square rounded-xl ${COLOR_STYLES[c]} ${
                  color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-offset-slate-800 dark:ring-white' : ''
                } grid place-items-center transition-all active:scale-90`}
                aria-label={c}
              >
                {color === c && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.categories.icon}</label>
          <div className="grid grid-cols-7 gap-2 max-h-[16rem] overflow-y-auto p-0.5">
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
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
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
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.common.saving : category ? t.common.save : t.common.new}
          </button>
        </div>
      </form>
    </Sheet>
  );
};
