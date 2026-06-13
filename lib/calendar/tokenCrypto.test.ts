import { describe, expect, it, afterEach, vi } from 'vitest';
import { encryptToken, decryptToken } from './tokenCrypto';

describe('tokenCrypto', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('cifra y descifra ida y vuelta', () => {
    const plain = 'refresh-token-secreto-123';
    const enc = encryptToken(plain);
    expect(enc).not.toBe(plain);
    expect(decryptToken(enc)).toBe(plain);
  });

  it('produce salidas distintas por IV aleatorio', () => {
    const a = encryptToken('mismo-valor');
    const b = encryptToken('mismo-valor');
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe('mismo-valor');
    expect(decryptToken(b)).toBe('mismo-valor');
  });

  it('formato iv.enc.tag con tres partes', () => {
    expect(encryptToken('x').split('.')).toHaveLength(3);
  });

  it('lanza si el token está malformado', () => {
    expect(() => decryptToken('solo-una-parte')).toThrow();
    expect(() => decryptToken('dos.partes')).toThrow();
  });

  it('lanza si el contenido fue alterado (auth tag)', () => {
    const enc = encryptToken('valor-original');
    const [iv, , tag] = enc.split('.');
    const tampered = `${iv}.${Buffer.from('otra-cosa').toString('base64url')}.${tag}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('usa GOOGLE_CALENDAR_TOKEN_KEY cuando está disponible', () => {
    vi.stubEnv('GOOGLE_CALENDAR_TOKEN_KEY', 'clave-a');
    const enc = encryptToken('payload');
    expect(decryptToken(enc)).toBe('payload');

    // Con otra clave, el descifrado del mismo blob debe fallar.
    vi.stubEnv('GOOGLE_CALENDAR_TOKEN_KEY', 'clave-b');
    expect(() => decryptToken(enc)).toThrow();
  });
});
