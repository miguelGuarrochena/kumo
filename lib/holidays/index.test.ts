import { describe, expect, it } from 'vitest';
import {
  buildHolidayIndex,
  countryFromTimezone,
  getHolidaysForCountry,
} from './index';

describe('countryFromTimezone', () => {
  it('detecta Argentina por timezones de la rama America/Argentina', () => {
    expect(countryFromTimezone('America/Argentina/Buenos_Aires')).toBe('AR');
    expect(countryFromTimezone('America/Argentina/Cordoba')).toBe('AR');
    expect(countryFromTimezone('America/Argentina/Ushuaia')).toBe('AR');
  });

  it('detecta España por Europe/Madrid', () => {
    expect(countryFromTimezone('Europe/Madrid')).toBe('ES');
  });

  it('detecta Chile', () => {
    expect(countryFromTimezone('America/Santiago')).toBe('CL');
    expect(countryFromTimezone('America/Punta_Arenas')).toBe('CL');
    expect(countryFromTimezone('Pacific/Easter')).toBe('CL');
  });

  it('detecta Uruguay, Colombia', () => {
    expect(countryFromTimezone('America/Montevideo')).toBe('UY');
    expect(countryFromTimezone('America/Bogota')).toBe('CO');
  });

  it('detecta USA en distintas zonas', () => {
    expect(countryFromTimezone('America/New_York')).toBe('US');
    expect(countryFromTimezone('America/Chicago')).toBe('US');
    expect(countryFromTimezone('America/Denver')).toBe('US');
    expect(countryFromTimezone('America/Los_Angeles')).toBe('US');
    expect(countryFromTimezone('America/Phoenix')).toBe('US');
    expect(countryFromTimezone('Pacific/Honolulu')).toBe('US');
  });

  it('cae al fallback AR para timezones desconocidos', () => {
    expect(countryFromTimezone('Asia/Tokyo')).toBe('AR');
    expect(countryFromTimezone('')).toBe('AR');
    expect(countryFromTimezone(null)).toBe('AR');
    expect(countryFromTimezone(undefined)).toBe('AR');
  });
});

describe('getHolidaysForCountry', () => {
  it('devuelve lista no vacía para cada país soportado', () => {
    expect(getHolidaysForCountry('AR').length).toBeGreaterThan(0);
    expect(getHolidaysForCountry('ES').length).toBeGreaterThan(0);
    expect(getHolidaysForCountry('CL').length).toBeGreaterThan(0);
    expect(getHolidaysForCountry('UY').length).toBeGreaterThan(0);
    expect(getHolidaysForCountry('CO').length).toBeGreaterThan(0);
    expect(getHolidaysForCountry('US').length).toBeGreaterThan(0);
  });

  it('AR incluye 1ro de mayo 2026', () => {
    const ar = getHolidaysForCountry('AR');
    const mayo1 = ar.find((h) => h.date === '2026-05-01');
    expect(mayo1).toBeDefined();
    expect(mayo1!.name).toMatch(/trabaj/i);
  });

  it('ES incluye 6 de enero (Epifanía)', () => {
    const es = getHolidaysForCountry('ES');
    const epifania = es.find((h) => h.date === '2026-01-06');
    expect(epifania).toBeDefined();
    expect(epifania!.name).toMatch(/epifan/i);
  });

  it('US incluye Independence Day en julio 4', () => {
    const us = getHolidaysForCountry('US');
    const jul4 = us.find((h) => h.date === '2026-07-04');
    expect(jul4).toBeDefined();
    expect(jul4!.name).toMatch(/independence/i);
  });
});

describe('buildHolidayIndex', () => {
  it('permite lookup O(1) por fecha', () => {
    const idx = buildHolidayIndex('AR');
    const found = idx.get('2026-12-25');
    expect(found).toBeDefined();
    expect(found!.name).toMatch(/navidad/i);
  });

  it('retorna undefined si la fecha no es feriado', () => {
    const idx = buildHolidayIndex('AR');
    expect(idx.get('2026-03-15')).toBeUndefined();
  });
});
