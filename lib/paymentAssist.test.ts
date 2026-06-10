import { describe, expect, it } from 'vitest';
import esMessages from '@/lib/i18n/messages/es.json';
import { buildPaymentCopyText, buildPaymentQrPayload, hasPaymentAssist } from './paymentAssist';

describe('paymentAssist', () => {
  const base = {
    creditorName: 'Juan',
    mpAlias: 'juan.perez.mp',
    amount: 8500,
    currency: 'ARS',
    concept: 'Cena viernes',
    locale: 'es' as const,
  };

  it('builds copy text with alias and amount', () => {
    const text = buildPaymentCopyText(base, esMessages);
    expect(text).toContain('juan.perez.mp');
    expect(text).toContain('Juan');
    expect(text).toContain('Cena viernes');
  });

  it('builds QR payload', () => {
    expect(buildPaymentQrPayload(base)).toBe('juan.perez.mp\n8500\nCena viernes');
  });

  it('detects when assist is available', () => {
    expect(hasPaymentAssist(base)).toBe(true);
    expect(hasPaymentAssist({ ...base, mpAlias: null, mpPaymentLink: null })).toBe(false);
  });
});
