import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelPreapproval, isMpConfigured } from '@/lib/mercadopago';

export const POST = async () => {
  if (!isMpConfigured()) {
    return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('provider_subscription_id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  const row = sub as { provider_subscription_id: string | null; status: string } | null;
  if (!row?.provider_subscription_id) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 });
  }

  try {
    await cancelPreapproval(row.provider_subscription_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
};
