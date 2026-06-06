import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPush } from '@/lib/push/server';

export const POST = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id);

  const rows = (subs ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No tenés dispositivos suscritos' }, { status: 400 });
  }

  const results = await Promise.all(rows.map((s) => sendPush(s, {
    title: 'Kumo',
    body: 'Notificación de prueba — todo funciona.',
    url: '/dashboard',
    tag: 'test',
  })));

  return NextResponse.json({ sent: results.filter((r) => r.ok).length, total: results.length });
};
