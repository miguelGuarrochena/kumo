import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { isWhatsAppConfigured, WhatsAppCloudAdapter } from './whatsapp';
import type { NotificationMessage } from './types';

describe('isWhatsAppConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('true con phone id y access token', () => {
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'tok');
    expect(isWhatsAppConfigured()).toBe(true);
  });

  it('false si falta alguna variable', () => {
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '');
    expect(isWhatsAppConfigured()).toBe(false);
  });
});

describe('WhatsAppCloudAdapter', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '999');
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'secret-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('lanza si faltan credenciales en el constructor', () => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '');
    expect(() => new WhatsAppCloudAdapter()).toThrow();
  });

  it('envía plantilla de vencimiento y devuelve channelId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.123' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new WhatsAppCloudAdapter();
    const message: NotificationMessage = {
      to: '+54 9 11 1234-5678',
      title: 'Luz',
      body: 'Luz vence el 12/06. Monto: $5000',
      ref: { type: 'expense', id: 'exp-1' },
    };

    const result = await adapter.send(message);

    expect(result).toEqual({ ok: true, channelId: 'wamid.123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/999/messages');
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.messaging_product).toBe('whatsapp');
    expect(payload.to).toBe('5491112345678'); // sin caracteres no numéricos
    expect(payload.template.name).toBe('kumo_vencimiento');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer secret-token',
    });
  });

  it('usa la plantilla de recordatorio para ref reminder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.456' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new WhatsAppCloudAdapter();
    await adapter.send({
      to: '5491100000000',
      title: 'Cumpleaños · Mamá · Kumo',
      body: 'Hola Juan, te aviso de parte de Kumo: mañana',
      ref: { type: 'reminder', id: 'rem-1' },
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.template.name).toBe('kumo_reminder');
  });

  it('devuelve error cuando la API responde no-ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid recipient' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new WhatsAppCloudAdapter();
    const result = await adapter.send({
      to: '123',
      title: 'x',
      body: 'x vence el hoy. Monto: $1',
      ref: { type: 'expense', id: 'e' },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid recipient');
  });

  it('captura errores de red', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new WhatsAppCloudAdapter();
    const result = await adapter.send({
      to: '123',
      title: 'x',
      body: 'x',
      ref: { type: 'reminder', id: 'r' },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('network down');
  });
});
