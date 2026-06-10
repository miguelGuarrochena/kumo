import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPreapproval, isMpConfigured, MP_PLAN_MONTHLY, MP_PLAN_YEARLY } from '@/lib/mercadopago';

export const POST = async (req: Request) => {
  if (!isMpConfigured()) {
    return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';
  const planId = interval === 'year' ? MP_PLAN_YEARLY : MP_PLAN_MONTHLY;
  if (!planId) {
    return NextResponse.json({ error: 'Plan no configurado' }, { status: 503 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';

  try {
    const pre = await createPreapproval({
      planId,
      payerEmail: user.email,
      userId: user.id,
      reason: interval === 'year' ? 'Kumo · Escaneo OCR · Anual' : 'Kumo · Escaneo OCR · Mensual',
      backUrl: `${origin}/settings?subscribed=1`,
    });

    return NextResponse.json({ url: pre.init_point });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
};
