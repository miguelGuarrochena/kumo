// Punto único de entrada para feriados. Infiere el país de la zona horaria
// del usuario para no requerir un campo extra de "país" en la base.

import { HOLIDAYS_AR } from './ar';
import { HOLIDAYS_ES } from './es';
import type { Country, Holiday } from './types';

export type { Country, Holiday } from './types';
export { COUNTRY_LABEL } from './types';

const HOLIDAYS_BY_COUNTRY: Record<Country, Holiday[]> = {
  AR: HOLIDAYS_AR,
  ES: HOLIDAYS_ES,
};

// Mapeo de prefijos de timezone IANA a country code.
// Mantenido manual para los timezones que ofrecemos en Settings.
const TZ_TO_COUNTRY: Array<{ prefix: string; country: Country }> = [
  { prefix: 'America/Argentina', country: 'AR' },
  { prefix: 'Europe/Madrid',     country: 'ES' },
  // Los demás timezones caen al default si no matchean.
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
