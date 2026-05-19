export type Holiday = {
  date: string; // 'YYYY-MM-DD' local
  name: string;
  type: 'inamovible' | 'trasladable' | 'puente' | 'no-laborable';
};

// Country codes ISO-3166 alpha-2 que tenemos cargados.
export type Country = 'AR' | 'ES' | 'CL' | 'UY' | 'CO' | 'US';

export const COUNTRY_LABEL: Record<Country, string> = {
  AR: 'Argentina',
  ES: 'España',
  CL: 'Chile',
  UY: 'Uruguay',
  CO: 'Colombia',
  US: 'Estados Unidos',
};
