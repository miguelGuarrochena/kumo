// Cron diario que avisa al admin si el consumo de Gemini se va de la mano.
// Corre todos los días a las 04:00 UTC (~01:00 ART). Lee el uso de ayer y
// del mes acumulado, y manda email a ADMIN_EMAIL si cruza alguno de los
// umbrales (ADMIN_GEMINI_DAILY_THRESHOLD_USD o ADMIN_GEMINI_MONTHLY_CAP_USD).

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/email';

type Totals = {
  ocr: number;
  nlp: number;
  total: number;
  calls: { ocr: number; nlp: number };
};

const sumRange = async (start: Date, end: Date): Promise<Totals> => {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('gemini_usage' as any) as any)
    .select('kind, est_cost_usd')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());
  const rows = ((data ?? []) as unknown) as { kind: 'ocr' | 'nlp'; est_cost_usd: number }[];
  const totals: Totals = { ocr: 0, nlp: 0, total: 0, calls: { ocr: 0, nlp: 0 } };
  for (const r of rows) {
    const cost = Number(r.est_cost_usd) || 0;
    if (r.kind === 'ocr') {
      totals.ocr += cost;
      totals.calls.ocr += 1;
    } else {
      totals.nlp += cost;
      totals.calls.nlp += 1;
    }
    totals.total += cost;
  }
  return totals;
};

const formatUsd = (n: number): string => `$${n.toFixed(3)}`;

const buildEmailHtml = (params: {
  yesterday: Totals;
  month: Totals;
  dailyThreshold: number;
  monthlyCap: number;
  overDaily: boolean;
  overMonthly: boolean;
}): string => {
  const { yesterday, month, dailyThreshold, monthlyCap, overDaily, overMonthly } = params;
  const lines = [
    overMonthly
      ? `<p style="color:#dc2626;font-weight:600">⚠️ Mes superó el cap de ${formatUsd(monthlyCap)}.</p>`
      : overDaily
        ? `<p style="color:#f59e0b;font-weight:600">⚠️ Día superó el umbral de ${formatUsd(dailyThreshold)}.</p>`
        : '',
    `<h3 style="margin-top:16px">Ayer</h3>`,
    `<p>Total: <strong>${formatUsd(yesterday.total)}</strong></p>`,
    `<p>OCR: ${yesterday.calls.ocr} llamadas (${formatUsd(yesterday.ocr)})</p>`,
    `<p>NLP: ${yesterday.calls.nlp} llamadas (${formatUsd(yesterday.nlp)})</p>`,
    `<h3 style="margin-top:16px">Mes en curso</h3>`,
    `<p>Total: <strong>${formatUsd(month.total)}</strong> / cap ${formatUsd(monthlyCap)}</p>`,
    `<p>OCR: ${month.calls.ocr} llamadas (${formatUsd(month.ocr)})</p>`,
    `<p>NLP: ${month.calls.nlp} llamadas (${formatUsd(month.nlp)})</p>`,
    `<hr style="margin:24px 0;border:0;border-top:1px solid #e5e7eb">`,
    `<p style="font-size:12px;color:#6b7280">Estimación basada en pricing de gemini-1.5-flash. Para detalles ver <a href="https://www.kumo-app.com/admin">/admin</a>.</p>`,
  ];
  return `<div style="font-family:system-ui,sans-serif;max-width:560px">${lines.join('')}</div>`;
};

const handler = async (req: Request) => {
  // Auth: Vercel Cron envía Bearer CRON_SECRET en el header.
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dailyThreshold = Number(process.env.ADMIN_GEMINI_DAILY_THRESHOLD_USD ?? '1');
  const monthlyCap = Number(process.env.ADMIN_GEMINI_MONTHLY_CAP_USD ?? '20');
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  // Ayer 00:00 UTC → hoy 00:00 UTC
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

  // Mes en curso
  const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth() + 1, 1));

  const [yesterday, month] = await Promise.all([
    sumRange(yesterdayStart, todayStart),
    sumRange(monthStart, monthEnd),
  ]);

  const overDaily = yesterday.total > dailyThreshold;
  const overMonthly = month.total > monthlyCap;

  if (!overDaily && !overMonthly) {
    return NextResponse.json({
      sent: false,
      reason: 'under_threshold',
      yesterday: yesterday.total,
      month: month.total,
    });
  }

  if (!adminEmail) {
    console.warn('[cron/gemini-alert] threshold cruzado pero ADMIN_EMAIL no está seteado');
    return NextResponse.json({
      sent: false,
      reason: 'admin_email_missing',
      yesterday: yesterday.total,
      month: month.total,
    });
  }

  const html = buildEmailHtml({
    yesterday,
    month,
    dailyThreshold,
    monthlyCap,
    overDaily,
    overMonthly,
  });

  const subject = overMonthly
    ? `Kumo · Gemini OVER CAP: ${formatUsd(month.total)} mes`
    : `Kumo · Gemini alerta: ${formatUsd(yesterday.total)} ayer`;

  const result = await sendEmail({
    to: adminEmail,
    subject,
    html,
  });

  return NextResponse.json({
    sent: result.ok,
    error: result.ok ? undefined : result.error,
    yesterday: yesterday.total,
    month: month.total,
    overDaily,
    overMonthly,
  });
};

export const POST = handler;
export const GET = handler;
