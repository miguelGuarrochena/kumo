'use client';

// Provider + hook para client components.
// El locale se pasa desde el server layout (vía RootProvider) para que no haya
// flash de idioma en la primera render.

import { createContext, useContext } from 'react';
import esMessages from './messages/es.json';
import enMessages from './messages/en.json';
import type { Locale, Messages } from './types';

const DICTIONARIES: Record<Locale, Messages> = {
  es: esMessages,
  en: enMessages,
};

type Ctx = { locale: Locale; t: Messages };

const I18nContext = createContext<Ctx>({ locale: 'es', t: esMessages });

type I18nProviderProps = {
  locale: Locale;
  children: React.ReactNode;
};

export const I18nProvider = ({ locale, children }: I18nProviderProps) => {
  return (
    <I18nContext.Provider value={{ locale, t: DICTIONARIES[locale] }}>
      {children}
    </I18nContext.Provider>
  );
};

/**
 * Hook para acceder a las traducciones desde un client component.
 * @example
 *   const { t } = useT();
 *   t.common.save  // "Guardar" o "Save" según locale
 */
export const useT = (): Ctx => {
  return useContext(I18nContext);
};

/**
 * Cambia el locale del usuario (lo persiste en cookie y recarga la página).
 */
export const setLocale = async (locale: Locale) => {
  await fetch('/api/locale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  });
  // Forzar reload para que server components vuelvan a leer
  if (typeof window !== 'undefined') window.location.reload();
};
