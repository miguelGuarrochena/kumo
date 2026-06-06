// Stub mínimo para que typecheck pase antes de `pnpm install stripe`.
// Se ignora cuando el paquete real está instalado.
declare module 'stripe' {
  namespace Stripe {
    type Subscription = {
      id: string;
      status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';
      customer: string | { id: string };
      items: { data: { price: { id: string } }[] };
      metadata: Record<string, string>;
      current_period_end: number;
    };
    namespace Subscription { type Status = Subscription['status']; }
    type Event = { type: string; data: { object: unknown } };
  }
  class Stripe {
    constructor(key: string, opts?: { apiVersion: string });
    customers: {
      create(params: { email: string; metadata?: Record<string, string> }): Promise<{ id: string }>;
    };
    checkout: {
      sessions: {
        create(params: Record<string, unknown>): Promise<{ url: string | null }>;
      };
    };
    billingPortal: {
      sessions: {
        create(params: Record<string, unknown>): Promise<{ url: string }>;
      };
    };
    webhooks: {
      constructEvent(payload: string, sig: string, secret: string): Stripe.Event;
    };
  }
  export = Stripe;
}
