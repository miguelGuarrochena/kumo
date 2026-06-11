import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getPreapproval, verifyMpSignature, mapStatus } from '@/lib/mercadopago';
import { resolvePlanTypeFromVariantId } from '@/lib/plans';

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const topic = url.searchParams.get('topic') ?? url.searchParams.get('type');
  let payload: { data?: { id?: string }; type?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const rawId = payload.data?.id ?? url.searchParams.get('data.id') ?? '';
  const dataId = String(rawId);
  if (!dataId) {
    return NextResponse.json({ received: true });
  }

  const valid = verifyMpSignature({
    signatureHeader: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId,
  });
  if (!valid) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const eventType = topic ?? payload.type ?? '';
  if (!eventType.includes('preapproval') && !eventType.includes('subscription')) {
    return NextResponse.json({ received: true });
  }

  const pre = await getPreapproval(dataId);
  const userId = pre.external_reference;
  if (!userId) {
    return NextResponse.json({ error: 'Preapproval sin external_reference' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const status = mapStatus(pre.status);
  const planType = resolvePlanTypeFromVariantId(pre.preapproval_plan_id) ?? 'ocr';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('subscriptions') as any).upsert({
    user_id: userId,
    status,
    plan_type: status === 'active' || status === 'trialing' ? planType : null,
    provider: 'mercadopago',
    provider_customer_id: String(pre.payer_id ?? ''),
    provider_subscription_id: pre.id,
    provider_variant_id: pre.preapproval_plan_id,
    current_period_end: pre.next_payment_date,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ received: true });
};
