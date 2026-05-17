/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'posthog-js' {
  const posthog: any;
  export default posthog;
}

declare module 'posthog-js/react' {
  export const PostHogProvider: any;
}

declare module '@sentry/nextjs' {
  export const withSentryConfig: any;
  export const init: any;
  export const onRequestError: any;
  export const captureException: any;
  export const captureMessage: any;
  export const startSpan: any;
  export const logger: any;
  export const replayIntegration: any;
  export const captureRouterTransitionStart: any;
  export const diagnoseSdkConnectivity: any;
  export const getClient: any;
  export const browserTracingIntegration: any;
  export const consoleLoggingIntegration: any;
  const Sentry: any;
  export default Sentry;
}
