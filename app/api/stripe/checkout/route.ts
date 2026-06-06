import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, isStripeConfigured } from '@/lib/stripe';

export const POST = async (req: Request) => {
  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';
  const price = interval === 'year' ? STRIPE_PRICE_YEARLY : STRIPE_PRICE_MONTHLY;
  if (!price) {
    return NextResponse.json({ error: 'Precio no configurado' }, { status: 503 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let customerId = (existing as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('subscriptions') as any)
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/settings?canceled=1`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
};
