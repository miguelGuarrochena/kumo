// Tipos compartidos del sistema de i18n.

import type es from './messages/es.json';

export type Locale = 'es' | 'en';

export const LOCALES: Locale[] = ['es', 'en'];

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

// El shape de los mensajes — derivado del archivo es.json para tener type-safety.
export type Messages = typeof es;
