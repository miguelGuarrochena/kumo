// Federal holidays of the United States.
// Source: U.S. Office of Personnel Management (OPM).
// When a holiday falls on Saturday, federal employees observe it on Friday;
// when it falls on Sunday, on Monday. Aquí marcamos la fecha calendario real.

import type { Holiday } from './types';

export const HOLIDAYS_US: Holiday[] = [
  // 2025
  { date: '2025-01-01', name: 'New Year\'s Day',                            type: 'inamovible' },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day',                 type: 'inamovible' },
  { date: '2025-02-17', name: 'Presidents\' Day',                           type: 'inamovible' },
  { date: '2025-05-26', name: 'Memorial Day',                               type: 'inamovible' },
  { date: '2025-06-19', name: 'Juneteenth',                                 type: 'inamovible' },
  { date: '2025-07-04', name: 'Independence Day',                           type: 'inamovible' },
  { date: '2025-09-01', name: 'Labor Day',                                  type: 'inamovible' },
  { date: '2025-10-13', name: 'Columbus Day',                               type: 'inamovible' },
  { date: '2025-11-11', name: 'Veterans Day',                               type: 'inamovible' },
  { date: '2025-11-27', name: 'Thanksgiving Day',                           type: 'inamovible' },
  { date: '2025-12-25', name: 'Christmas Day',                              type: 'inamovible' },

  // 2026
  { date: '2026-01-01', name: 'New Year\'s Day',                            type: 'inamovible' },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day',                 type: 'inamovible' },
  { date: '2026-02-16', name: 'Presidents\' Day',                           type: 'inamovible' },
  { date: '2026-05-25', name: 'Memorial Day',                               type: 'inamovible' },
  { date: '2026-06-19', name: 'Juneteenth',                                 type: 'inamovible' },
  { date: '2026-07-03', name: 'Independence Day (observed)',                type: 'trasladable' },
  { date: '2026-07-04', name: 'Independence Day',                           type: 'inamovible' },
  { date: '2026-09-07', name: 'Labor Day',                                  type: 'inamovible' },
  { date: '2026-10-12', name: 'Columbus Day',                               type: 'inamovible' },
  { date: '2026-11-11', name: 'Veterans Day',                               type: 'inamovible' },
  { date: '2026-11-26', name: 'Thanksgiving Day',                           type: 'inamovible' },
  { date: '2026-12-25', name: 'Christmas Day',                              type: 'inamovible' },

  // 2027
  { date: '2027-01-01', name: 'New Year\'s Day',                            type: 'inamovible' },
  { date: '2027-01-18', name: 'Martin Luther King Jr. Day',                 type: 'inamovible' },
  { date: '2027-02-15', name: 'Presidents\' Day',                           type: 'inamovible' },
  { date: '2027-05-31', name: 'Memorial Day',                               type: 'inamovible' },
  { date: '2027-06-18', name: 'Juneteenth (observed)',                      type: 'trasladable' },
  { date: '2027-06-19', name: 'Juneteenth',                                 type: 'inamovible' },
  { date: '2027-07-05', name: 'Independence Day (observed)',                type: 'trasladable' },
  { date: '2027-07-04', name: 'Independence Day',                           type: 'inamovible' },
  { date: '2027-09-06', name: 'Labor Day',                                  type: 'inamovible' },
  { date: '2027-10-11', name: 'Columbus Day',                               type: 'inamovible' },
  { date: '2027-11-11', name: 'Veterans Day',                               type: 'inamovible' },
  { date: '2027-11-25', name: 'Thanksgiving Day',                           type: 'inamovible' },
  { date: '2027-12-24', name: 'Christmas Day (observed)',                   type: 'trasladable' },
  { date: '2027-12-25', name: 'Christmas Day',                              type: 'inamovible' },
];
