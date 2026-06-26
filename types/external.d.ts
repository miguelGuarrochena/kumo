 

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

declare module 'resend' {
  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(payload: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
        reply_to?: string;
        replyTo?: string;
      }): Promise<{ data?: { id: string } | null; error?: { message: string; name?: string } | null }>;
    };
  }
}

declare module 'xlsx' {
  export const utils: {
    aoa_to_sheet: (data: any[][]) => any;
    book_new: () => any;
    book_append_sheet: (wb: any, ws: any, name: string) => void;
    decode_range: (ref: string) => { s: { c: number; r: number }; e: { c: number; r: number } };
    encode_cell: (cell: { r: number; c: number }) => string;
  };
  export function write(wb: any, opts: { type: 'buffer' | 'array' | 'binary' | 'base64'; bookType: 'xlsx' }): any;
  export function read(data: any, opts?: any): any;
}
