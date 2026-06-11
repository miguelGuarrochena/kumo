import type { PlanProduct } from './plans';

export type ProductPricing = {
  monthly: string;
  yearly: string;
};

export type Pricing = {
  ocr: ProductPricing;
  wa: ProductPricing;
  bundle: ProductPricing;
  yearlyPct: number;
  bundleSavingsMonthly: string;
};

const fmt = (key: string, fallback: string) => process.env[key] ?? fallback;

export const getPricing = (): Pricing => {
  const ocrMonthly = fmt('NEXT_PUBLIC_PRICE_OCR_MONTHLY', fmt('NEXT_PUBLIC_PRICE_MONTHLY', 'ARS 3.500'));
  const ocrYearly = fmt('NEXT_PUBLIC_PRICE_OCR_YEARLY', fmt('NEXT_PUBLIC_PRICE_YEARLY', 'ARS 35.000'));
  const waMonthly = fmt('NEXT_PUBLIC_PRICE_WA_MONTHLY', 'ARS 3.000');
  const waYearly = fmt('NEXT_PUBLIC_PRICE_WA_YEARLY', 'ARS 30.000');
  const bundleMonthly = fmt('NEXT_PUBLIC_PRICE_BUNDLE_MONTHLY', 'ARS 5.990');
  const bundleYearly = fmt('NEXT_PUBLIC_PRICE_BUNDLE_YEARLY', 'ARS 59.900');

  return {
    ocr: { monthly: ocrMonthly, yearly: ocrYearly },
    wa: { monthly: waMonthly, yearly: waYearly },
    bundle: { monthly: bundleMonthly, yearly: bundleYearly },
    yearlyPct: Number(process.env.NEXT_PUBLIC_PRICE_YEARLY_PCT ?? '17'),
    bundleSavingsMonthly: 'ARS 510',
  };
};

export const getProductPricing = (product: PlanProduct): ProductPricing => {
  const p = getPricing();
  return p[product];
};

/** @deprecated Usar getProductPricing('ocr') */
export const getLegacyOcrPricing = (): { monthly: string; yearly: string; yearlyPct: number } => {
  const p = getPricing();
  return { monthly: p.ocr.monthly, yearly: p.ocr.yearly, yearlyPct: p.yearlyPct };
};
