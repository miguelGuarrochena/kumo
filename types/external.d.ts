// Ambient declarations para módulos opcionales que pueden no estar instalados
// localmente. En Vercel se instalan desde package.json y los types reales
// toman precedencia sobre estos fallbacks.
//
// Si querés type-safety completo localmente, instalá los paquetes con pnpm install
// y podés borrar este archivo.

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'posthog-js' {
  const posthog: any;
  export default posthog;
}

declare module 'posthog-js/react' {
  export const PostHogProvider: any;
}

declare module '@sentry/nextjs' {
  export function init(opts: any): void;
  export const onRequestError: any;
  const Sentry: any;
  export default Sentry;
}
