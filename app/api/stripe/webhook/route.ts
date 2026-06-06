import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';

export const POST = async (req: Request) => {
  if (!stripe) return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook secret faltante' }, { status: 503 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Sin signature' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id as string | undefined)
        ?? await resolveUserIdFromCustomer(supabase, sub.customer as string);
      if (!userId) break;

      const status = mapStatus(sub.status);
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('subscriptions') as any).upsert({
        user_id: userId,
        status,
        stripe_customer_id: sub.customer as string,
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items.data[0]?.price.id ?? null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id as string | undefined)
        ?? await resolveUserIdFromCustomer(supabase, sub.customer as string);
      if (!userId) break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('subscriptions') as any).update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
};

const mapStatus = (s: Stripe.Subscription.Status): 'trialing' | 'active' | 'past_due' | 'canceled' | 'free' => {
  if (s === 'trialing') return 'trialing';
  if (s === 'active') return 'active';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled';
  return 'free';
};

const resolveUserIdFromCustomer = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  customerId: string,
): Promise<string | null> => {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
};
