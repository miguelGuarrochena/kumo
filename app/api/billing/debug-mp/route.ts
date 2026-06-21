/**
 * Debug admin-only: muestra el estado del plan en MP y la URL de checkout
 * que se le devolvería al cliente. Útil para diagnóstico futuro.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getMpPlanId } from '@/lib/plans';
import { getPlanCheckoutUrl } from '@/lib/mercadopago';

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';

export const GET = async (req: Request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 });
  }

  const url = new URL(req.url);
  const interval = url.searchParams.get('interval') === 'year' ? 'year' : 'month';
  const planId = getMpPlanId('ocr', interval);

  const planRes = await fetch(`https://api.mercadopago.com/preapproval_plan/${planId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const planJson = (await planRes.json()) as {
    id?: string;
    status?: string;
    back_url?: string | null;
    init_point?: string | null;
    auto_recurring?: { transaction_amount?: number; currency_id?: string } | null;
    payment_methods_allowed?: unknown;
  };

  const checkoutUrl = getPlanCheckoutUrl({ planId, userId: user.id });

  return NextResponse.json({
    deploy: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    plan: {
      id: planJson.id ?? null,
      status: planJson.status ?? null,
      back_url: planJson.back_url ?? null,
      init_point: planJson.init_point ?? null,
      amount: planJson.auto_recurring?.transaction_amount ?? null,
      currency: planJson.auto_recurring?.currency_id ?? null,
      hasPma: Boolean(planJson.payment_methods_allowed),
    },
    checkoutUrl,
    token: {
      prefix: ACCESS_TOKEN.slice(0, 12),
      length: ACCESS_TOKEN.length,
    },
  });
};
