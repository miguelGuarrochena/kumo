import {
  Wallet, Home, ShoppingCart, Zap, Car, Heart, MoreHorizontal,
  Coffee, Plane, BookOpen, Gift, Smartphone, Utensils,
  Dumbbell, Sparkles, Dog, Baby, Briefcase, GraduationCap, Music, Film,
  Stethoscope, PawPrint, Shirt, Fuel, PiggyBank, CreditCard, Cake,
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

export const ICON_KEYS = Object.keys(ICON_MAP);

export const CATEGORY_COLORS = [
  'sky', 'lavender', 'peach', 'mint', 'rose',
  'amber', 'fuchsia', 'emerald', 'indigo', 'slate',
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const COLOR_STYLES: Record<CategoryColor, string> = {
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

export const iconFor = (key: string): React.ComponentType<{ className?: string }> =>
  ICON_MAP[key] ?? Wallet;

export const colorStyleFor = (color: string): string =>
  COLOR_STYLES[color as CategoryColor] ?? COLOR_STYLES.sky;
