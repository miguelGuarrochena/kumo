/** Límites de WhatsApp automático (costo Meta). */

export const WA_MONTHLY_CAP = Number(process.env.WA_MONTHLY_CAP ?? '200');

export const WA_MAX_RECIPIENTS_PER_ALERT = Number(process.env.WA_MAX_RECIPIENTS ?? '3');

export const currentWaMonthKey = (): string => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
