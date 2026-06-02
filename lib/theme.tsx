'use client';

// Implementación mínima del tema (light / dark / system) — reemplaza next-themes
// que inyectaba un <script> en el árbol React y disparaba warnings con React 19.
//
// La pre-hidratación (evitar flash light → dark) se hace con un script INLINE
// puesto en el <head> desde el server layout vía dangerouslySetInnerHTML —
// ese script corre antes del primer paint, lee localStorage y aplica la clase
// `dark` directamente al <html>.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
  if (resolved === 'dark') html.classList.add('dark');
  else html.classList.remove('dark');
  html.style.colorScheme = resolved;
  return resolved;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Init: leer localStorage + aplicar
  useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as Theme | null;
    const initial: Theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setThemeState(initial);
    setResolvedTheme(applyTheme(initial));
  }, []);

  // Si está en system, escuchamos cambios del media query
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme('system'));
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, t);
      setResolvedTheme(applyTheme(t));
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): Ctx => useContext(ThemeContext);

// Script inline para pre-hidratación (evita flash). Se inserta en el <head>.
// Lee localStorage; si dice 'dark' (o 'system' + prefers dark), agrega la clase
// `dark` al <html> antes de que renderice React.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((t==='system'||!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.style.colorScheme='light';}}catch(e){}})();`;
