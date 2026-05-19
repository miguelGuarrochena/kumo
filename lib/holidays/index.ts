// Punto único de entrada para feriados. Infiere el país de la zona horaria
// del usuario para no requerir un campo extra de "país" en la base.

import { HOLIDAYS_AR } from './ar';
import { HOLIDAYS_ES } from './es';
import { HOLIDAYS_CL } from './cl';
import { HOLIDAYS_UY } from './uy';
import { HOLIDAYS_CO } from './co';
import { HOLIDAYS_US } from './us';
import type { Country, Holiday } from './types';

export type { Country, Holiday } from './types';
export { COUNTRY_LABEL } from './types';

const HOLIDAYS_BY_COUNTRY: Record<Country, Holiday[]> = {
  AR: HOLIDAYS_AR,
  ES: HOLIDAYS_ES,
  CL: HOLIDAYS_CL,
  UY: HOLIDAYS_UY,
  CO: HOLIDAYS_CO,
  US: HOLIDAYS_US,
};

// Mapeo de prefijos de timezone IANA a country code.
// El primer match gana, así que ordenamos del más específico al más genérico.
const TZ_TO_COUNTRY: Array<{ prefix: string; country: Country }> = [
  { prefix: 'America/Argentina', country: 'AR' },
  { prefix: 'Europe/Madrid',     country: 'ES' },
  { prefix: 'America/Santiago',  country: 'CL' },
  { prefix: 'America/Punta_Arenas', country: 'CL' },
  { prefix: 'Pacific/Easter',    country: 'CL' },
  { prefix: 'America/Montevideo', country: 'UY' },
  { prefix: 'America/Bogota',    country: 'CO' },
  { prefix: 'America/New_York',  country: 'US' },
  { prefix: 'America/Chicago',   country: 'US' },
  { prefix: 'America/Denver',    country: 'US' },
  { prefix: 'America/Los_Angeles', country: 'US' },
  { prefix: 'America/Phoenix',   country: 'US' },
  { prefix: 'America/Anchorage', country: 'US' },
  { prefix: 'Pacific/Honolulu',  country: 'US' },
  { prefix: 'America/Indiana',   country: 'US' },
  { prefix: 'America/Detroit',   country: 'US' },
];

export const countryFromTimezone = (tz: string | null | undefined): Country => {
  if (!tz) return 'AR';
  for (const { prefix, country } of TZ_TO_COUNTRY) {
    if (tz.startsWith(prefix)) return country;
  }
  return 'AR'; // fallback razonable para LATAM
};

export const getHolidaysForCountry = (country: Country): Holiday[] =>
  HOLIDAYS_BY_COUNTRY[country] ?? [];

// Construye un map indexado por fecha para lookups O(1).
export const buildHolidayIndex = (country: Country): Map<string, Holiday> =>
  new Map(getHolidaysForCountry(country).map((h) => [h.date, h]));
