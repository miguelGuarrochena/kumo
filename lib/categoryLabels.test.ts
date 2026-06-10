import { describe, expect, it } from 'vitest';
import esMessages from '@/lib/i18n/messages/es.json';
import enMessages from '@/lib/i18n/messages/en.json';
import { categoryDisplayName, categoryNamesMatch, getCategoryPresetKey } from './categoryLabels';

describe('categoryLabels', () => {
  it('maps default Spanish names to preset keys', () => {
    expect(getCategoryPresetKey('Alquiler')).toBe('rent');
    expect(getCategoryPresetKey('Supermercado')).toBe('groceries');
    expect(getCategoryPresetKey('Otros')).toBe('other');
  });

  it('translates preset names per locale', () => {
    expect(categoryDisplayName('Alquiler', esMessages)).toBe('Alquiler');
    expect(categoryDisplayName('Alquiler', enMessages)).toBe('Rent');
    expect(categoryDisplayName('Supermercado', enMessages)).toBe('Groceries');
  });

  it('keeps custom category names unchanged', () => {
    expect(categoryDisplayName('Streaming', enMessages)).toBe('Streaming');
  });

  it('matches names across locales', () => {
    expect(categoryNamesMatch('Supermercado', 'Groceries')).toBe(true);
    expect(categoryNamesMatch('Alquiler', 'Rent')).toBe(true);
    expect(categoryNamesMatch('Streaming', 'Groceries')).toBe(false);
  });
});
