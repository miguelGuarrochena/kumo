import { describe, expect, it } from 'vitest';
import { buildIcsCalendar } from './ics';

describe('buildIcsCalendar', () => {
  it('genera VCALENDAR válido con recordatorio', () => {
    const ics = buildIcsCalendar(
      [{
        id: 'rem-1',
        title: 'Dentista',
        description: 'Control anual',
        reminder_date: '2026-06-15',
        reminder_time: '10:30',
        reminder_type: 'medical',
      }],
      [],
    );

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:kumo-reminder-rem-1@kumo-app.com');
    expect(ics).toContain('SUMMARY:Turno médico: Dentista');
    expect(ics).toContain('DESCRIPTION:Control anual');
    expect(ics).toContain('DTSTART:20260615T103000');
  });

  it('usa DATE para recordatorio sin hora', () => {
    const ics = buildIcsCalendar(
      [{
        id: 'rem-2',
        title: 'Cumple Ana',
        description: null,
        reminder_date: '2026-07-01',
        reminder_time: null,
        reminder_type: 'birthday',
      }],
      [],
    );

    expect(ics).toContain('DTSTART;VALUE=DATE:20260701');
    expect(ics).toContain('SUMMARY:Cumpleaños: Cumple Ana');
  });

  it('incluye gastos impagos con due_date', () => {
    const ics = buildIcsCalendar(
      [],
      [{
        id: 'exp-1',
        description: 'Alquiler',
        due_date: '2026-06-10',
        amount: 150000,
        currency: 'ARS',
        paid: false,
      }],
    );

    expect(ics).toContain('UID:kumo-expense-exp-1@kumo-app.com');
    expect(ics).toContain('SUMMARY:Vence: Alquiler');
    expect(ics).toContain('DESCRIPTION:150000 ARS');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260610');
  });

  it('omite gastos pagados', () => {
    const ics = buildIcsCalendar(
      [],
      [{
        id: 'exp-2',
        description: 'Luz',
        due_date: '2026-06-10',
        amount: 5000,
        currency: 'ARS',
        paid: true,
      }],
    );

    expect(ics).not.toContain('kumo-expense-exp-2');
  });

  it('escapa caracteres especiales en ICS', () => {
    const ics = buildIcsCalendar(
      [{
        id: 'rem-3',
        title: 'Reunión; importante',
        description: 'Línea 1\nLínea 2',
        reminder_date: '2026-06-20',
        reminder_time: null,
        reminder_type: 'other',
      }],
      [],
    );

    expect(ics).toContain('SUMMARY:Recordatorio: Reunión\\; importante');
    expect(ics).toContain('DESCRIPTION:Línea 1\\nLínea 2');
  });
});
