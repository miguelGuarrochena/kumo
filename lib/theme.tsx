'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kumo_theme';

type Ctx = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<Ctx>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

const readSystem = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme): 'light' | 'dark' => {
  const resolved = theme === 'system' ? readSystem() : theme;
  const html = document.documentElement;
  html.classList.add('theme-changing');
  if (resolved === 'dark') html.classList.add('dark');
  else html.classList.remove('dark');
  html.style.colorScheme = resolved;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.classList.remove('theme-changing');
    });
  });
  return resolved;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  // La landing ("/") siempre se muestra en modo claro.
  const forceLight = pathname === '/';
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Cargar la preferencia guardada una sola vez. Se hace en un efecto (no en el
  // initializer de useState) para evitar mismatch de hidratación: el server no
  // tiene acceso a localStorage.
  useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as Theme | null;
    const initial: Theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setThemeState(initial);
  }, []);

  // Aplicar el tema al DOM (sincronización con sistema externo) y guardar el
  // tema resuelto para exponerlo por contexto.
  useEffect(() => {
    setResolvedTheme(applyTheme(forceLight ? 'light' : theme));
  }, [theme, forceLight]);

  useEffect(() => {
    if (forceLight || theme !== 'system' || typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme('system'));
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme, forceLight]);

  const setTheme = useCallback((t: Theme) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    if (!forceLight) setResolvedTheme(applyTheme(t));
  }, [forceLight]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): Ctx => useContext(ThemeContext);

export const themeInitScript = `(function(){try{if(location.pathname==='/'){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';return;}var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((t==='system'||!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.style.colorScheme='light';}}catch(e){}})();`;
