import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const GET = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const present = (v: string | undefined) => Boolean(v && v.length > 0);

  return NextResponse.json({
    env: {
      MP_ACCESS_TOKEN:       present(process.env.MP_ACCESS_TOKEN),
      MP_WEBHOOK_SECRET:     present(process.env.MP_WEBHOOK_SECRET),
      MP_PLAN_MONTHLY:       present(process.env.MP_PLAN_MONTHLY),
      MP_PLAN_YEARLY:        present(process.env.MP_PLAN_YEARLY),
      SUPABASE_SERVICE_ROLE: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      PRICE_MONTHLY:         process.env.NEXT_PUBLIC_PRICE_MONTHLY ?? null,
      PRICE_YEARLY:          process.env.NEXT_PUBLIC_PRICE_YEARLY ?? null,
      PRICE_YEARLY_PCT:
        process.env.NEXT_PUBLIC_PRICE_YEARLY_PCT
        ?? process.env.NEXT_PUBLIC_PRICE_YEARLY_SAVINGS_PCT
        ?? null,
    },
    user: { id: user.id, email: user.email },
  });
};
