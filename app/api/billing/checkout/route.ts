import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPreapproval, isMpProductConfigured } from '@/lib/mercadopago';
import {
  checkoutIntervalToPlan,
  checkoutReason,
  getMpPlanId,
  type CheckoutInterval,
  type PlanInterval,
  type PlanProduct,
} from '@/lib/plans';
import { BILLING_TERMS_VERSION } from '@/lib/legal/billingTerms';
import { isWaBillingEnabled } from '@/lib/billing/waBilling';

export const POST = async (req: Request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const product: PlanProduct =
    body.product === 'wa' || body.product === 'bundle' ? body.product : 'ocr';

  const checkoutInterval: CheckoutInterval =
    body.interval === 'yearly_auto' || body.interval === 'year_auto' ? 'yearly_auto'
    : body.interval === 'yearly_once' || body.interval === 'year' ? 'yearly_once'
    : 'monthly';

  const billingInterval = checkoutIntervalToPlan(checkoutInterval);

  if ((product === 'wa' || product === 'bundle') && !isWaBillingEnabled()) {
    return NextResponse.json(
      { error: 'WhatsApp automático y combo aún no están disponibles. Por ahora solo podés suscribirte al escaneo OCR.', code: 'WA_BILLING_DISABLED' },
      { status: 403 },
    );
  }

  if (body.acceptTerms !== true) {
    return NextResponse.json({ error: 'Debés aceptar los términos y condiciones' }, { status: 400 });
  }
  if (body.termsVersion !== BILLING_TERMS_VERSION) {
    return NextResponse.json({ error: 'Versión de términos desactualizada. Recargá la página.' }, { status: 400 });
  }

  if (!isMpProductConfigured(product)) {
    return NextResponse.json({ error: 'MercadoPago no configurado para este plan' }, { status: 503 });
  }

  const planId = getMpPlanId(product, billingInterval);
  if (!planId) {
    return NextResponse.json({ error: 'Plan no configurado' }, { status: 503 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';

  try {
    const pre = await createPreapproval({
      planId,
      payerEmail: user.email,
      userId: user.id,
      reason: checkoutReason(product, billingInterval),
      backUrl: `${origin}/settings?subscribed=1`,
    });

    const { error: termsErr } = await supabase.rpc('record_billing_terms_acceptance', {
      p_terms_version: BILLING_TERMS_VERSION,
      p_plan_product: product,
      p_billing_interval: billingInterval as PlanInterval,
      p_mp_preapproval_id: pre.id,
    });
    if (termsErr) {
      console.error('record_billing_terms_acceptance:', termsErr);
      return NextResponse.json({ error: 'No se pudo registrar la aceptación de términos' }, { status: 500 });
    }

    return NextResponse.json({ url: pre.init_point });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
};
