import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isWhatsAppConfigured } from '@/lib/notifications/whatsapp';

export const GET = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const present = (v: string | undefined) => Boolean(v && v.length > 0);

  return NextResponse.json({
    env: {
      MP_ACCESS_TOKEN:          present(process.env.MP_ACCESS_TOKEN),
      MP_WEBHOOK_SECRET:        present(process.env.MP_WEBHOOK_SECRET),
      MP_PLAN_OCR_MONTHLY:      present(process.env.MP_PLAN_OCR_MONTHLY ?? process.env.MP_PLAN_MONTHLY),
      MP_PLAN_OCR_YEARLY:       present(process.env.MP_PLAN_OCR_YEARLY ?? process.env.MP_PLAN_YEARLY),
      MP_PLAN_WA_MONTHLY:       present(process.env.MP_PLAN_WA_MONTHLY),
      MP_PLAN_WA_YEARLY:        present(process.env.MP_PLAN_WA_YEARLY),
      MP_PLAN_BUNDLE_MONTHLY:   present(process.env.MP_PLAN_BUNDLE_MONTHLY),
      MP_PLAN_BUNDLE_YEARLY:    present(process.env.MP_PLAN_BUNDLE_YEARLY),
      MP_PLAN_OCR_YEARLY_AUTO:  present(process.env.MP_PLAN_OCR_YEARLY_AUTO),
      MP_PLAN_WA_YEARLY_AUTO:   present(process.env.MP_PLAN_WA_YEARLY_AUTO),
      MP_PLAN_BUNDLE_YEARLY_AUTO: present(process.env.MP_PLAN_BUNDLE_YEARLY_AUTO),
      SUPABASE_SERVICE_ROLE:    present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      VAPID_PUBLIC:             present(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      VAPID_PRIVATE:            present(process.env.VAPID_PRIVATE_KEY),
      PRICE_OCR_MONTHLY:        process.env.NEXT_PUBLIC_PRICE_OCR_MONTHLY ?? process.env.NEXT_PUBLIC_PRICE_MONTHLY ?? null,
      PRICE_WA_MONTHLY:         process.env.NEXT_PUBLIC_PRICE_WA_MONTHLY ?? null,
      PRICE_BUNDLE_MONTHLY:     process.env.NEXT_PUBLIC_PRICE_BUNDLE_MONTHLY ?? null,
      PRICE_YEARLY_PCT:         process.env.NEXT_PUBLIC_PRICE_YEARLY_PCT ?? null,
      GOOGLE_AI_API_KEY:        present(process.env.GOOGLE_AI_API_KEY),
      WHATSAPP:                 isWhatsAppConfigured(),
      CRON_SECRET:              present(process.env.CRON_SECRET),
    },
    user: { id: user.id, email: user.email },
  });
};
