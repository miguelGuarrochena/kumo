// Paleta visual de espacios: 12 íconos + 9 colores.
// Distinto al set de categorías para evitar confusión.

import {
  Home, Users, Heart, Briefcase, Baby, Sparkles, Coffee, Plane,
  Gift, BookOpen, Gamepad2, Building2,
  type LucideIcon,
} from 'lucide-react';

export const WORKSPACE_ICONS: Record<string, LucideIcon> = {
  home:        Home,
  users:       Users,
  heart:       Heart,
  briefcase:   Briefcase,
  baby:        Baby,
  sparkles:    Sparkles,
  coffee:      Coffee,
  plane:       Plane,
  gift:        Gift,
  'book-open': BookOpen,
  'gamepad-2': Gamepad2,
  building:    Building2,
};

export const WORKSPACE_ICON_KEYS = Object.keys(WORKSPACE_ICONS);

export const WORKSPACE_COLORS = [
  'sky', 'lavender', 'peach', 'mint', 'rose',
  'amber', 'fuchsia', 'emerald', 'indigo',
] as const;

export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number];

// Background + text tonal por color (con dark mode).
export const WORKSPACE_COLOR_STYLES: Record<string, string> = {
  sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
  peach:    'bg-peach-100 text-peach-400 dark:bg-peach-500/20',
  mint:     'bg-mint-100 text-mint-500 dark:bg-mint-500/20',
  rose:     'bg-rose-100 text-rose-400 dark:bg-rose-500/20',
  amber:    'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  fuchsia:  'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  emerald:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  indigo:   'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
};

// Solo el dot del color, sin texto (para el color picker).
export const WORKSPACE_COLOR_DOT: Record<string, string> = {
  sky:      'bg-sky-400',
  lavender: 'bg-lavender-400',
  peach:    'bg-peach-400',
  mint:     'bg-mint-400',
  rose:     'bg-rose-400',
  amber:    'bg-amber-500',
  fuchsia:  'bg-fuchsia-500',
  emerald:  'bg-emerald-500',
  indigo:   'bg-indigo-500',
};

export const getWorkspaceIcon = (iconKey: string): LucideIcon =>
  WORKSPACE_ICONS[iconKey] ?? Home;

export const getWorkspaceColorClass = (colorKey: string): string =>
  WORKSPACE_COLOR_STYLES[colorKey] ?? WORKSPACE_COLOR_STYLES.sky!;
