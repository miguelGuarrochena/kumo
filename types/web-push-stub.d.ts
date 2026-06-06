// Stub mínimo para `web-push` antes de `pnpm install web-push @types/web-push`.
declare module 'web-push' {
  export type PushSubscription = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    sub: PushSubscription,
    payload?: string | Buffer,
    options?: Record<string, unknown>,
  ): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>;
  const webpush: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default webpush;
}
