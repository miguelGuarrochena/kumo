import type { Locale } from './types';

/** Tag BCP-47 para Intl según el locale de la app. */
export const localeTag = (locale: Locale | string): string =>
  locale === 'en' ? 'en-US' : 'es-AR';
