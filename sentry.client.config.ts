// Sentry — config del cliente (browser).
// El DSN se carga desde NEXT_PUBLIC_SENTRY_DSN. Si no está, el SDK queda inactivo.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',

    // Performance monitoring (lo dejamos bajo para no quemar quota)
    tracesSampleRate: 0.1,

    // Session replays — solo cuando hay error
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Filtrar ruido común
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
      // Chrome extensions
      /chrome-extension/,
      /moz-extension/,
    ],

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeSend(event: any) {
      // No mandar errores en dev local
      if (process.env.NODE_ENV === 'development') return null;
      return event;
    },
  });
}
