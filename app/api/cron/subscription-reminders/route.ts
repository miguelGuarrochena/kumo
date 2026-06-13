import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email';
import { renderSubscriptionReminderEmail } from '@/lib/email/templates';
import { isYearlyOneTimeVariant } from '@/lib/plans';

const DAY_MS = 86_400_000;

type SubRow = {
  user_id: string;
  status: string;
  plan_type: string | null;
  current_period_end: string;
  provider_variant_id: string | null;
  expiry_reminder_30d_at: string | null;
  expiry_reminder_7d_at: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  ocr: 'Escaneo OCR',
  wa: 'WhatsApp automático',
  bundle: 'Kumo Pro',
};

const daysUntil = (endIso: string): number =>
  Math.round((new Date(endIso).getTime() - Date.now()) / DAY_MS);

const handler = async (req: Request) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const horizon = new Date(now + 32 * DAY_MS).toISOString();

  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'user_id, status, plan_type, current_period_end, provider_variant_id, expiry_reminder_30d_at, expiry_reminder_7d_at',
    )
    .eq('provider', 'mercadopago')
    .not('current_period_end', 'is', null)
    .gt('current_period_end', new Date().toISOString())
    .lte('current_period_end', horizon)
    .in('status', ['active', 'canceled']);

  if (error) {
    console.error('[cron/subscription-reminders] query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kumo-app.com'}/settings#plans`;
  let sent30 = 0;
  let sent7 = 0;
  let skipped = 0;

  for (const raw of (data ?? []) as SubRow[]) {
    const left = daysUntil(raw.current_period_end);
    const isYearly = isYearlyOneTimeVariant(raw.provider_variant_id);
    const planLabel = PLAN_LABELS[raw.plan_type ?? ''] ?? 'Kumo Pro';

    const sendFor = (window: 30 | 7): boolean => {
      if (window === 30) {
        return left >= 29 && left <= 31 && !raw.expiry_reminder_30d_at;
      }
      return left >= 6 && left <= 8 && !raw.expiry_reminder_7d_at;
    };

    for (const window of [30, 7] as const) {
      if (!sendFor(window)) {
        skipped += 1;
        continue;
      }

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(raw.user_id);
      if (userError || !userData.user?.email) {
        console.warn('[cron/subscription-reminders] no email for', raw.user_id, userError?.message);
        skipped += 1;
        continue;
      }

      const expiresAt = new Date(raw.current_period_end).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const rendered = renderSubscriptionReminderEmail({
        daysLeft: window,
        planLabel,
        expiresAt,
        isYearly,
        settingsUrl,
      });

      const result = await sendEmail({
        to: userData.user.email,
        subject: rendered.subject,
        html: rendered.html,
      });

      if (!result.ok) {
        console.warn('[cron/subscription-reminders] send failed', raw.user_id, result.error);
        skipped += 1;
        continue;
      }

      const nowIso = new Date().toISOString();
      const patch =
        window === 30
          ? { expiry_reminder_30d_at: nowIso, updated_at: nowIso }
          : { expiry_reminder_7d_at: nowIso, updated_at: nowIso };
      await supabase.from('subscriptions').update(patch).eq('user_id', raw.user_id);

      if (window === 30) sent30 += 1;
      else sent7 += 1;
    }
  }

  return NextResponse.json({ sent30, sent7, skipped });
};

export const POST = handler;
export const GET = handler;
