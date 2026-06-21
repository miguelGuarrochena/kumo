/**
 * TEMP: endpoint de debug para el bug `card_token_id is required`.
 * Reproduce el call exacto que hace /api/billing/checkout pero sin
 * registrar nada en DB. Devuelve body enviado + response de MP al cliente.
 *
 * Solo accesible para admins. Borrar este archivo cuando el bug esté resuelto.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getMpPlanId } from '@/lib/plans';

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

  const reqBody = {
    preapproval_plan_id: planId,
    reason: `Kumo Pro · Debug (${interval})`,
    back_url: 'https://kumo-app.com/settings?subscribed=1',
    external_reference: user.id,
  };

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reqBody),
  });
  const mpText = await mpRes.text();

  return NextResponse.json({
    deploy: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    request: {
      planId,
      planIdLen: planId.length,
      body: reqBody,
    },
    token: {
      prefix: ACCESS_TOKEN.slice(0, 12),
      length: ACCESS_TOKEN.length,
    },
    response: {
      status: mpRes.status,
      ok: mpRes.ok,
      body: mpText,
    },
  });
};
