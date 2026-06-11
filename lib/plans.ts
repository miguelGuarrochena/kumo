export type PlanProduct = 'ocr' | 'wa' | 'bundle';
export type PlanInterval = 'month' | 'year' | 'year_auto';

export type CheckoutInterval = 'monthly' | 'yearly_once' | 'yearly_auto';

export const parsePlanType = (raw: string | null | undefined): PlanProduct | null => {
  if (raw === 'ocr' || raw === 'wa' || raw === 'bundle') return raw;
  return null;
};

const MP_PLAN_IDS: Record<PlanProduct, Record<PlanInterval, string>> = {
  ocr: {
    month: process.env.MP_PLAN_OCR_MONTHLY ?? process.env.MP_PLAN_MONTHLY ?? '',
    year: process.env.MP_PLAN_OCR_YEARLY ?? process.env.MP_PLAN_YEARLY ?? '',
    year_auto: process.env.MP_PLAN_OCR_YEARLY_AUTO ?? '',
  },
  wa: {
    month: process.env.MP_PLAN_WA_MONTHLY ?? '',
    year: process.env.MP_PLAN_WA_YEARLY ?? '',
    year_auto: process.env.MP_PLAN_WA_YEARLY_AUTO ?? '',
  },
  bundle: {
    month: process.env.MP_PLAN_BUNDLE_MONTHLY ?? '',
    year: process.env.MP_PLAN_BUNDLE_YEARLY ?? '',
    year_auto: process.env.MP_PLAN_BUNDLE_YEARLY_AUTO ?? '',
  },
};

export const getMpPlanId = (product: PlanProduct, interval: PlanInterval): string =>
  MP_PLAN_IDS[product][interval];

export const checkoutIntervalToPlan = (interval: CheckoutInterval): PlanInterval => {
  if (interval === 'yearly_auto') return 'year_auto';
  if (interval === 'yearly_once') return 'year';
  return 'month';
};

export const resolvePlanTypeFromVariantId = (variantId: string | null): PlanProduct | null => {
  if (!variantId) return null;
  for (const product of ['ocr', 'wa', 'bundle'] as const) {
    for (const key of ['month', 'year', 'year_auto'] as const) {
      if (MP_PLAN_IDS[product][key] === variantId) return product;
    }
  }
  return null;
};

export const resolvePlanIntervalFromVariantId = (variantId: string | null): PlanInterval | null => {
  if (!variantId) return null;
  for (const product of ['ocr', 'wa', 'bundle'] as const) {
    if (MP_PLAN_IDS[product].year_auto === variantId) return 'year_auto';
    if (MP_PLAN_IDS[product].year === variantId) return 'year';
    if (MP_PLAN_IDS[product].month === variantId) return 'month';
  }
  return null;
};

export const isYearlyPlanVariant = (variantId: string | null): boolean => {
  const interval = resolvePlanIntervalFromVariantId(variantId);
  return interval === 'year' || interval === 'year_auto';
};

export const isYearlyOneTimeVariant = (variantId: string | null): boolean =>
  resolvePlanIntervalFromVariantId(variantId) === 'year';

export const isYearlyAutoRenewVariant = (variantId: string | null): boolean =>
  resolvePlanIntervalFromVariantId(variantId) === 'year_auto';

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
  const period =
    interval === 'year_auto' ? 'Anual (renovación automática)'
    : interval === 'year' ? 'Anual (sin renovación)'
    : 'Mensual';
  return `Kumo · ${labels[product]} · ${period}`;
};
