/** Límites WA para UI en cliente (defaults alineados con waLimits.ts en servidor). */

export const WA_MONTHLY_CAP = Number(process.env.NEXT_PUBLIC_WA_MONTHLY_CAP ?? '200');

export const WA_MAX_RECIPIENTS = Number(process.env.NEXT_PUBLIC_WA_MAX_RECIPIENTS ?? '3');
