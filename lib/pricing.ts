export type Pricing = {
  monthly: string;
  yearly: string;
  yearlyPct: number;
};

export const getPricing = (): Pricing => ({
  monthly:   process.env.NEXT_PUBLIC_PRICE_MONTHLY ?? 'ARS 3.500',
  yearly:    process.env.NEXT_PUBLIC_PRICE_YEARLY  ?? 'ARS 35.000',
  yearlyPct: Number(process.env.NEXT_PUBLIC_PRICE_YEARLY_PCT ?? '17'),
});
