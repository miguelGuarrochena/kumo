// Tracking de uso de Gemini: cada llamada a OCR o lenguaje natural inserta
// una fila en `gemini_usage` con un costo USD estimado. Se usa después en
// /admin y en el cron diario para mandar alerta al admin.
//
// Los costos están en USD según el pricing de gemini-1.5-flash en jun 2026
// (~$0.075 / 1M input tokens + $0.30 / 1M output). Para OCR sumamos el
// costo de la imagen (~$0.000005 / image input token, ~258 tokens / imagen).
// Si después usamos un modelo más caro, ajustar las constantes.

import { createServiceClient } from '@/lib/supabase/service';

const COST_PER_OCR_USD = 0.005;
const COST_PER_NLP_USD = 0.0003;

export type GeminiCallKind = 'ocr' | 'nlp';

export const estimateGeminiCost = (kind: GeminiCallKind): number =>
  kind === 'ocr' ? COST_PER_OCR_USD : COST_PER_NLP_USD;

/**
 * Registra una llamada a Gemini. No bloquea — si falla el insert, lo logueamos
 * y seguimos. No queremos que un problema de monitoring rompa el flow del user.
 */
export const logGeminiCall = async (params: {
  userId: string | null;
  kind: GeminiCallKind;
  estCostUsd?: number;
}): Promise<void> => {
  try {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('gemini_usage' as any) as any).insert({
      user_id: params.userId,
      kind: params.kind,
      est_cost_usd: params.estCostUsd ?? estimateGeminiCost(params.kind),
    });
  } catch (e) {
    console.error('[gemini-usage] log failed:', (e as Error).message);
  }
};

type UsageRange = { start: Date; end: Date };

const sumUsage = async (range: UsageRange) => {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('gemini_usage' as any) as any)
    .select('kind, est_cost_usd')
    .gte('created_at', range.start.toISOString())
    .lt('created_at', range.end.toISOString());
  const rows = ((data ?? []) as unknown) as { kind: GeminiCallKind; est_cost_usd: number }[];
  const totals = { ocr: 0, nlp: 0, total: 0, calls: { ocr: 0, nlp: 0 } };
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

/** Suma de hoy (UTC desde 00:00). */
export const todayUsage = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return sumUsage({ start, end });
};

/** Suma del mes actual (primer día UTC → mes siguiente). */
export const monthUsage = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return sumUsage({ start, end });
};

/** Top N usuarios por consumo del mes. */
export const topUsersThisMonth = async (limit = 5) => {
  const supabase = createServiceClient();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('gemini_usage' as any) as any)
    .select('user_id, est_cost_usd')
    .gte('created_at', start.toISOString());
  const rows = ((data ?? []) as unknown) as { user_id: string | null; est_cost_usd: number }[];
  const byUser = new Map<string, number>();
  for (const r of rows) {
    if (!r.user_id) continue;
    byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + (Number(r.est_cost_usd) || 0));
  }
  return Array.from(byUser.entries())
    .map(([userId, total]) => ({ userId, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};
