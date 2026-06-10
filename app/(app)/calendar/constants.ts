import { Stethoscope, Cake, Bell } from 'lucide-react';
import type { ReminderType } from './types';

export const COLOR_DOT: Record<string, string> = {
  sky:      'bg-sky-500',
  lavender: 'bg-lavender-500',
  peach:    'bg-peach-400',
  mint:     'bg-mint-500',
  rose:     'bg-rose-400',
};

// Metadatos visuales por tipo. Las etiquetas legibles se resuelven vía i18n
// (t.calendar.type_*), no se guardan acá.
export const TYPE_META = {
  medical:  { icon: Stethoscope, dot: 'bg-rose-500',     tone: 'rose' },
  birthday: { icon: Cake,        dot: 'bg-lavender-500', tone: 'lavender' },
  generic:  { icon: Bell,        dot: 'bg-sky-500',      tone: 'sky' },
} as const;

// Mapa tipo → clave i18n para la etiqueta legible.
export const TYPE_LABEL_KEY: Record<ReminderType, 'type_medical' | 'type_birthday' | 'type_generic'> = {
  medical: 'type_medical',
  birthday: 'type_birthday',
  generic: 'type_generic',
};

export const TONE_STYLES: Record<string, string> = {
  rose:     'bg-rose-100 text-rose-500 dark:bg-rose-500/20',
  lavender: 'bg-lavender-100 text-lavender-500 dark:bg-lavender-500/20',
  sky:      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
};

export const WS_VISIBILITY_KEY = 'kumo-calendar-ws';

export const WS_COLOR_DOT: Record<string, string> = {
  sky:      'bg-sky-500',
  lavender: 'bg-lavender-500',
  peach:    'bg-peach-400',
  mint:     'bg-mint-500',
  rose:     'bg-rose-400',
  amber:    'bg-amber-400',
  fuchsia:  'bg-fuchsia-500',
  emerald:  'bg-emerald-500',
  indigo:   'bg-indigo-500',
  slate:    'bg-slate-400',
};
