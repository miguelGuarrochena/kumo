'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Wallet, Home, ShoppingCart, Zap, Car, Heart, MoreHorizontal,
  Coffee, Plane, BookOpen, Gift, Smartphone, Utensils, Plus, Pencil, Trash2, Check,
  Dumbbell, Sparkles, Dog, Baby, Briefcase, GraduationCap, Music, Film,
  Stethoscope, PawPrint, Shirt, Fuel, PiggyBank, CreditCard, Cake,
} from 'lucide-react';
import { upsertCategory, deleteCategory } from './actions';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Database } from '@/lib/supabase/database.types';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n/client';

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
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  dog: Dog,
  baby: Baby,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  music: Music,
  film: Film,
  stethoscope: Stethoscope,
  'paw-print': PawPrint,
  shirt: Shirt,
  fuel: Fuel,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  cake: Cake,
};

const ICONS = Object.keys(ICON_MAP);
const COLORS = [
  'sky', 'lavender', 'peach', 'mint', 'rose',
  'amber', 'fuchsia', 'emerald', 'indigo', 'slate',
] as const;

const COLOR_STYLES: Record<(typeof COLORS)[number], string> = {
  sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
  peach:    'bg-peach-100 text-peach-400 dark:bg-peach-500/20',
  mint:     'bg-mint-100 text-mint-500 dark:bg-mint-500/20',
  rose:     'bg-rose-100 text-rose-400 dark:bg-rose-500/20',
  amber:    'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  fuchsia:  'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  emerald:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  indigo:   'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
  slate:    'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

export const CategoriesClient = ({ initialCategories }: { initialCategories: Category[] }) => {
  const { t } = useT();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const router = useRouter();

  const onDelete = async () => {
    if (!toDelete) return;
    const result = await deleteCategory(toDelete.id);
    if (result.ok) {
      toast.success(`"${toDelete.name}" ✓`);
      router.refresh();
    } else {
      toast.error(result.error ?? 'Error');
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
          {t.categories.new}
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
        title={t.categories.delete_confirm_title}
        description={t.categories.delete_confirm.replace('{name}', toDelete?.name ?? '')}
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
        <div className="font-medium truncate">{category.name}</div>
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
  onClose,
}: {
  open: boolean;
  category: Category | null;
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

    startTransition(async () => {
      const result = await upsertCategory({ ok: false }, fd);
      if (result.ok) {
        toast.success(category ? t.common.saved : '✓');
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
