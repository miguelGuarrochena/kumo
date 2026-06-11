import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPreapproval, isMpProductConfigured } from '@/lib/mercadopago';
import { checkoutReason, getMpPlanId, type PlanInterval, type PlanProduct } from '@/lib/plans';

export const POST = async (req: Request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const interval: PlanInterval = body.interval === 'year' ? 'year' : 'month';
  const product: PlanProduct =
    body.product === 'wa' || body.product === 'bundle' ? body.product : 'ocr';

  if (!isMpProductConfigured(product)) {
    return NextResponse.json({ error: 'MercadoPago no configurado para este plan' }, { status: 503 });
  }

  const planId = getMpPlanId(product, interval);
  if (!planId) {
    return NextResponse.json({ error: 'Plan no configurado' }, { status: 503 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';

  try {
    const pre = await createPreapproval({
      planId,
      payerEmail: user.email,
      userId: user.id,
      reason: checkoutReason(product, interval),
      backUrl: `${origin}/settings?subscribed=1`,
    });

    return NextResponse.json({ url: pre.init_point });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
};
