export type OpenCommandPaletteOptions = {
  /** Texto inicial en el input (ej. abrir desde "Gasto con IA"). */
  query?: string;
};

export const COMMAND_PALETTE_OPEN_EVENT = 'kumo:open-command-palette';

/** Abre el command palette (Cmd+K). Funciona desde cualquier componente cliente. */
export const openCommandPalette = (options?: OpenCommandPaletteOptions) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(COMMAND_PALETTE_OPEN_EVENT, { detail: options ?? {} }),
  );
};

/** Atajo de teclado: Cmd+K en Mac, Ctrl+K en Windows/Linux. */
export const dispatchCommandPaletteShortcut = () => {
  if (typeof window === 'undefined') return;
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    }),
  );
};
