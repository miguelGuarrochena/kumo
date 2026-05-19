import { describe, expect, it } from 'vitest';
import {
  buildGrid,
  dayKey,
  daysBetween,
  parseLocalDate,
  shiftMonth,
  todayKey,
  toIsoLocal,
} from './date';

describe('dayKey', () => {
  it('normaliza un ISO completo a solo YYYY-MM-DD', () => {
    expect(dayKey('2026-05-18T00:00:00Z')).toBe('2026-05-18');
    expect(dayKey('2026-05-18T03:00:00.000+00:00')).toBe('2026-05-18');
  });

  it('deja un YYYY-MM-DD inalterado', () => {
    expect(dayKey('2026-05-18')).toBe('2026-05-18');
  });

  it('maneja null y undefined sin romper', () => {
    expect(dayKey(null)).toBe('');
    expect(dayKey(undefined)).toBe('');
  });
});

describe('parseLocalDate', () => {
  it('parsea un YYYY-MM-DD como Date LOCAL (sin shift de UTC)', () => {
    const d = parseLocalDate('2026-05-18');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4); // mayo = 4
    expect(d!.getDate()).toBe(18);
  });

  it('devuelve null para strings inválidos', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('foo')).toBeNull();
    expect(parseLocalDate('2026-05')).toBeNull();
  });

  it('acepta strings con sufijo tipo ISO completo', () => {
    const d = parseLocalDate('2026-05-18T12:30:00Z');
    expect(d!.getDate()).toBe(18);
  });
});

describe('todayKey', () => {
  it('formatea con padding correcto', () => {
    // Forzamos una fecha conocida
    const d = new Date(2026, 0, 5); // 5 de enero
    expect(todayKey(d)).toBe('2026-01-05');
  });

  it('usa componentes locales (no UTC)', () => {
    const d = new Date(2026, 11, 31); // 31 dic local
    expect(todayKey(d)).toBe('2026-12-31');
  });
});

describe('toIsoLocal', () => {
  it('pads single-digit month y day', () => {
    expect(toIsoLocal(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(toIsoLocal(new Date(2026, 8, 9))).toBe('2026-09-09');
  });
});

describe('daysBetween', () => {
  it('calcula diferencias positivas', () => {
    expect(daysBetween('2026-05-18', '2026-05-20')).toBe(2);
    expect(daysBetween('2026-05-18', '2026-06-18')).toBe(31);
  });

  it('calcula diferencias negativas', () => {
    expect(daysBetween('2026-05-20', '2026-05-18')).toBe(-2);
  });

  it('devuelve 0 cuando alguna fecha es inválida', () => {
    expect(daysBetween('foo', '2026-05-18')).toBe(0);
    expect(daysBetween('2026-05-18', 'foo')).toBe(0);
  });

  it('mismo día = 0', () => {
    expect(daysBetween('2026-05-18', '2026-05-18')).toBe(0);
  });
});

describe('shiftMonth', () => {
  it('avanza un mes', () => {
    expect(shiftMonth(2026, 5, 1)).toBe('2026-06');
  });

  it('retrocede un mes', () => {
    expect(shiftMonth(2026, 5, -1)).toBe('2026-04');
  });

  it('cruza el año al avanzar desde diciembre', () => {
    expect(shiftMonth(2026, 12, 1)).toBe('2027-01');
  });

  it('cruza el año al retroceder desde enero', () => {
    expect(shiftMonth(2026, 1, -1)).toBe('2025-12');
  });
});

describe('buildGrid', () => {
  it('genera exactamente 42 celdas (6 semanas × 7 días)', () => {
    const cells = buildGrid(2026, 5);
    expect(cells).toHaveLength(42);
  });

  it('mayo 2026 arranca un viernes — la primera celda debería ser el lunes 27 de abril', () => {
    // May 1, 2026 = Friday (JS getDay() = 5)
    const cells = buildGrid(2026, 5);
    expect(cells[0]!.dateStr).toBe('2026-04-27');
    expect(cells[0]!.day).toBe(27);
    expect(cells[0]!.month).toBe(4);
  });

  it('el día 18 de mayo 2026 (lunes) cae en la celda correcta', () => {
    const cells = buildGrid(2026, 5);
    // Posición esperada: la grilla arranca 27 abril (lunes), 18 mayo es 21 días después
    const cell = cells.find((c) => c.dateStr === '2026-05-18');
    expect(cell).toBeDefined();
    expect(cell!.day).toBe(18);
    expect(cell!.month).toBe(5);
    expect(cell!.year).toBe(2026);
  });

  it('si el mes arranca en lunes, la primera celda es el día 1', () => {
    // junio 2026 arranca en lunes
    const cells = buildGrid(2026, 6);
    expect(cells[0]!.dateStr).toBe('2026-06-01');
    expect(cells[0]!.day).toBe(1);
  });

  it('si el mes arranca en domingo, la primera celda es el lunes anterior', () => {
    // febrero 2026 arranca en domingo
    const cells = buildGrid(2026, 2);
    expect(cells[0]!.dateStr).toBe('2026-01-26'); // lunes anterior
    expect(cells[0]!.day).toBe(26);
  });

  it('todas las dateStr siguen formato YYYY-MM-DD', () => {
    const cells = buildGrid(2027, 12);
    for (const cell of cells) {
      expect(cell.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
