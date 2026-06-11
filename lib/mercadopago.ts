import { createHmac, timingSafeEqual } from 'node:crypto';
import { getMpPlanId, type PlanProduct } from '@/lib/plans';

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? '';

/** @deprecated Usar getMpPlanId('ocr', 'month') */
export const MP_PLAN_MONTHLY = process.env.MP_PLAN_OCR_MONTHLY ?? process.env.MP_PLAN_MONTHLY ?? '';
/** @deprecated Usar getMpPlanId('ocr', 'year') */
export const MP_PLAN_YEARLY = process.env.MP_PLAN_OCR_YEARLY ?? process.env.MP_PLAN_YEARLY ?? '';

export const isMpConfigured = (): boolean =>
  ACCESS_TOKEN !== '' && (
    getMpPlanId('bundle', 'month') !== ''
    || getMpPlanId('ocr', 'month') !== ''
    || getMpPlanId('wa', 'month') !== ''
  );

export const isMpProductConfigured = (product: PlanProduct): boolean =>
  ACCESS_TOKEN !== '' && getMpPlanId(product, 'month') !== '';

const API = 'https://api.mercadopago.com';

const mpFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
};

export type MpPreapproval = {
  id: string;
  status: 'authorized' | 'paused' | 'cancelled' | 'pending';
  payer_id: number;
  payer_email: string;
  preapproval_plan_id: string;
  external_reference: string;
  next_payment_date: string | null;
  reason: string;
  init_point: string;
};

export const createPreapproval = (params: {
  planId: string;
  payerEmail: string;
  userId: string;
  reason: string;
  backUrl: string;
}): Promise<MpPreapproval> =>
  mpFetch<MpPreapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      preapproval_plan_id: params.planId,
      payer_email: params.payerEmail,
      reason: params.reason,
      back_url: params.backUrl,
      external_reference: params.userId,
    }),
  });

export const getPreapproval = (id: string): Promise<MpPreapproval> =>
  mpFetch<MpPreapproval>(`/preapproval/${id}`);

export const cancelPreapproval = (id: string): Promise<MpPreapproval> =>
  mpFetch<MpPreapproval>(`/preapproval/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  });

export const verifyMpSignature = (params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
}): boolean => {
  if (!WEBHOOK_SECRET) return false;
  if (!params.signatureHeader || !params.requestId) return false;

  const parts = Object.fromEntries(
    params.signatureHeader.split(',').map((p) => p.trim().split('=')) as [string, string][],
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const template = `id:${params.dataId};request-id:${params.requestId};ts:${ts};`;
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(template).digest('hex');

  const a = Buffer.from(v1, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const mapStatus = (
  status: MpPreapproval['status'],
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'free' => {
  switch (status) {
    case 'authorized': return 'active';
    case 'pending':    return 'trialing';
    case 'paused':     return 'past_due';
    case 'cancelled':  return 'canceled';
    default:           return 'free';
  }
};
