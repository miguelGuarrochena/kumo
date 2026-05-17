// Lectura del locale en server components.
// Lee la cookie 'locale'. Default: 'es'.

import { cookies } from 'next/headers';
import esMessages from './messages/es.json';
import enMessages from './messages/en.json';
import type { Locale, Messages } from './types';

const DICTIONARIES: Record<Locale, Messages> = {
  es: esMessages,
  en: enMessages,
};

export async function getLocale(): Promise<Locale> {
  try {
    const c = await cookies();
    const v = c.get('locale')?.value;
    if (v === 'en' || v === 'es') return v;
  } catch {
    // ignore
  }
  return 'es';
}

export async function getMessages(): Promise<Messages> {
  const locale = await getLocale();
  return DICTIONARIES[locale];
}
