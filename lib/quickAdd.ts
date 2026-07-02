export const QUICK_ADD_OPEN_EVENT = 'kumo:open-quick-add';

/** Abre el sheet global de carga rápida. Funciona desde cualquier componente cliente. */
export const openQuickAdd = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(QUICK_ADD_OPEN_EVENT));
};

export type QuickAddIntent = 'new' | 'income' | 'scan';

/**
 * Construye la URL de /expenses con el intent de carga. Si ya estamos en
 * /expenses preserva los query params actuales (mes, vista, etc.).
 */
export const quickAddHref = (intent: QuickAddIntent): string => {
  const params =
    typeof window !== 'undefined' && window.location.pathname === '/expenses'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  // La carga vive en la pestaña de movimientos, no en Saldos.
  params.delete('section');
  params.delete('new');
  params.delete('scan');
  if (intent === 'scan') params.set('scan', '1');
  else params.set('new', intent === 'income' ? 'income' : '1');
  return `/expenses?${params.toString()}`;
};
