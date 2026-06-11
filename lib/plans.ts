export type PlanProduct = 'ocr' | 'wa' | 'bundle';
export type PlanInterval = 'month' | 'year';

const MP_PLAN_IDS: Record<PlanProduct, Record<PlanInterval, string>> = {
  ocr: {
    month: process.env.MP_PLAN_OCR_MONTHLY ?? process.env.MP_PLAN_MONTHLY ?? '',
    year: process.env.MP_PLAN_OCR_YEARLY ?? process.env.MP_PLAN_YEARLY ?? '',
  },
  wa: {
    month: process.env.MP_PLAN_WA_MONTHLY ?? '',
    year: process.env.MP_PLAN_WA_YEARLY ?? '',
  },
  bundle: {
    month: process.env.MP_PLAN_BUNDLE_MONTHLY ?? '',
    year: process.env.MP_PLAN_BUNDLE_YEARLY ?? '',
  },
};

export const getMpPlanId = (product: PlanProduct, interval: PlanInterval): string =>
  MP_PLAN_IDS[product][interval];

export const resolvePlanTypeFromVariantId = (variantId: string | null): PlanProduct | null => {
  if (!variantId) return null;
  for (const product of ['ocr', 'wa', 'bundle'] as const) {
    if (MP_PLAN_IDS[product].month === variantId || MP_PLAN_IDS[product].year === variantId) {
      return product;
    }
  }
  return null;
};

export const planIncludesOcr = (planType: PlanProduct | null): boolean =>
  planType === 'ocr' || planType === 'bundle';

export const planIncludesWa = (planType: PlanProduct | null): boolean =>
  planType === 'wa' || planType === 'bundle';

export const checkoutReason = (product: PlanProduct, interval: PlanInterval): string => {
  const labels: Record<PlanProduct, string> = {
    ocr: 'Escaneo OCR',
    wa: 'WhatsApp automático',
    bundle: 'Kumo Pro (OCR + WhatsApp)',
  };
  const period = interval === 'year' ? 'Anual' : 'Mensual';
  return `Kumo · ${labels[product]} · ${period}`;
};
