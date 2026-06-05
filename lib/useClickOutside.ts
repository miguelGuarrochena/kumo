'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Cierra un dropdown / popover cuando el usuario hace click afuera del ref dado.
 *
 * Usa listeners a nivel `document` (mousedown + touchstart) en vez de un
 * backdrop `<div>` con `fixed inset-0`. Esto es importante cuando el
 * dropdown vive dentro de un padre con `backdrop-filter` (sidebar con
 * blur, modales con blur, etc.), porque `backdrop-filter` crea un
 * containing block para elementos posicionados `fixed` — el backdrop
 * queda atrapado adentro y no cubre toda la página.
 */
export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean,
  onOutside: () => void,
) => {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current && !ref.current.contains(target)) {
        onOutside();
      }
    };

    // mousedown se dispara antes que click — la UI cierra al inicio del gesto.
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [enabled, ref, onOutside]);
};
