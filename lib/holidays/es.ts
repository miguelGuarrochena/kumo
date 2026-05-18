// Feriados nacionales de España.
// Fuente: BOE — calendario laboral nacional. No incluye festivos autonómicos
// porque varían por comunidad; podemos sumarlos después según la timezone más fina.

import type { Holiday } from './types';

export const HOLIDAYS_ES: Holiday[] = [
  // 2025
  { date: '2025-01-01', name: 'Año Nuevo',                                  type: 'inamovible' },
  { date: '2025-01-06', name: 'Epifanía del Señor',                         type: 'inamovible' },
  { date: '2025-04-18', name: 'Viernes Santo',                              type: 'inamovible' },
  { date: '2025-05-01', name: 'Fiesta del Trabajo',                         type: 'inamovible' },
  { date: '2025-08-15', name: 'Asunción de la Virgen',                      type: 'inamovible' },
  { date: '2025-10-13', name: 'Fiesta Nacional de España (trasladado)',     type: 'trasladable' },
  { date: '2025-11-01', name: 'Todos los Santos',                           type: 'inamovible' },
  { date: '2025-12-06', name: 'Día de la Constitución',                     type: 'inamovible' },
  { date: '2025-12-08', name: 'Inmaculada Concepción',                      type: 'inamovible' },
  { date: '2025-12-25', name: 'Natividad del Señor',                        type: 'inamovible' },

  // 2026
  { date: '2026-01-01', name: 'Año Nuevo',                                  type: 'inamovible' },
  { date: '2026-01-06', name: 'Epifanía del Señor',                         type: 'inamovible' },
  { date: '2026-04-03', name: 'Viernes Santo',                              type: 'inamovible' },
  { date: '2026-05-01', name: 'Fiesta del Trabajo',                         type: 'inamovible' },
  { date: '2026-08-15', name: 'Asunción de la Virgen',                      type: 'inamovible' },
  { date: '2026-10-12', name: 'Fiesta Nacional de España',                  type: 'inamovible' },
  { date: '2026-12-07', name: 'Día de la Constitución (trasladado)',        type: 'trasladable' },
  { date: '2026-12-08', name: 'Inmaculada Concepción',                      type: 'inamovible' },
  { date: '2026-12-25', name: 'Natividad del Señor',                        type: 'inamovible' },

  // 2027
  { date: '2027-01-01', name: 'Año Nuevo',                                  type: 'inamovible' },
  { date: '2027-01-06', name: 'Epifanía del Señor',                         type: 'inamovible' },
  { date: '2027-03-26', name: 'Viernes Santo',                              type: 'inamovible' },
  { date: '2027-05-01', name: 'Fiesta del Trabajo',                         type: 'inamovible' },
  { date: '2027-08-16', name: 'Asunción de la Virgen (trasladado)',         type: 'trasladable' },
  { date: '2027-10-12', name: 'Fiesta Nacional de España',                  type: 'inamovible' },
  { date: '2027-11-01', name: 'Todos los Santos',                           type: 'inamovible' },
  { date: '2027-12-06', name: 'Día de la Constitución',                     type: 'inamovible' },
  { date: '2027-12-08', name: 'Inmaculada Concepción',                      type: 'inamovible' },
  { date: '2027-12-25', name: 'Natividad del Señor',                        type: 'inamovible' },
];
