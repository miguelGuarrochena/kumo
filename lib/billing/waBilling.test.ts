import { describe, expect, it, afterEach, vi } from 'vitest';
import { isWaBillingEnabled, availableCheckoutProducts } from './waBilling';

// Estos tests corren en happy-dom, donde `window` está definido,
// por lo que se ejercita la rama de cliente de isWaBillingEnabled.
describe('isWaBillingEnabled (cliente)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('false cuando NEXT_PUBLIC_WHATSAPP_PENDING=true', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PENDING', 'true');
    expect(isWaBillingEnabled()).toBe(false);
  });

  it('true cuando no está en revisión', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PENDING', '');
    expect(isWaBillingEnabled()).toBe(true);
  });
});

describe('availableCheckoutProducts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('solo OCR cuando WA está deshabilitado', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PENDING', 'true');
    expect(availableCheckoutProducts()).toEqual(['ocr']);
  });

  it('incluye wa y bundle cuando está habilitado', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PENDING', '');
    expect(availableCheckoutProducts()).toEqual(['ocr', 'wa', 'bundle']);
  });
});
