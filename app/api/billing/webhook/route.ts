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
  const resolvedPlanType = resolvePlanTypeFromVariantId(pre.preapproval_plan_id) ?? 'ocr';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('subscriptions') as any)
    .select('current_period_end, plan_type, expiry_reminder_30d_at, expiry_reminder_7d_at')
    .eq('user_id', userId)
    .maybeSingle();

  const existingRow = existing as {
    current_period_end: string | null;
    plan_type: string | null;
    expiry_reminder_30d_at: string | null;
    expiry_reminder_7d_at: string | null;
  } | null;

  const nextPeriodEnd = pre.next_payment_date ?? existingRow?.current_period_end ?? null;
  const periodStillActive =
    nextPeriodEnd !== null && new Date(nextPeriodEnd).getTime() > Date.now();
  const keepsPlanAccess =
    status === 'active' ||
    status === 'trialing' ||
    (status === 'canceled' && periodStillActive);

  let expiryReminder30dAt = existingRow?.expiry_reminder_30d_at ?? null;
  let expiryReminder7dAt = existingRow?.expiry_reminder_7d_at ?? null;
  if (
    existingRow?.current_period_end &&
    nextPeriodEnd &&
    new Date(nextPeriodEnd).getTime() > new Date(existingRow.current_period_end).getTime()
  ) {
    expiryReminder30dAt = null;
    expiryReminder7dAt = null;
  }

  const planType = keepsPlanAccess
    ? (resolvedPlanType ?? existingRow?.plan_type ?? 'ocr')
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('subscriptions') as any).upsert({
    user_id: userId,
    status,
    plan_type: planType,
    provider: 'mercadopago',
    provider_customer_id: String(pre.payer_id ?? ''),
    provider_subscription_id: pre.id,
    provider_variant_id: pre.preapproval_plan_id,
    current_period_end: nextPeriodEnd,
    expiry_reminder_30d_at: expiryReminder30dAt,
    expiry_reminder_7d_at: expiryReminder7dAt,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ received: true });
};
