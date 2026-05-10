// Adapter de WhatsApp via Meta Cloud API (oficial).
//
// Por qué este y no Twilio: pega DIRECTO a graph.facebook.com sin intermediarios.
// Tier gratis de Meta: 1.000 conversaciones/mes. Después se paga directo a Meta sin
// markup de proveedores como Twilio.
//
// Setup:
//  1. https://developers.facebook.com/apps → crear app → tipo "Business".
//  2. Agregar producto "WhatsApp" → setup.
//  3. Te dan un Phone Number ID y un Access Token temporal (24hs) para probar.
//  4. Para producción: generar System User token permanente.
//  5. Verificar el número que vas a usar como remitente.
//
// Para mensajes "iniciados por la empresa" (notificaciones de Kumo) tenés que usar
// templates pre-aprobadas. Hay templates default ("hello_world") para empezar.
// Para mensajes dentro de una conversación abierta (24hs después que el user te escribió)
// podés mandar texto libre.

import type { NotificationAdapter, NotificationMessage, NotificationResult } from './types';

const GRAPH_VERSION = 'v21.0';

export class WhatsAppCloudAdapter implements NotificationAdapter {
  readonly id = 'whatsapp';
  private phoneId: string;
  private token: string;

  constructor() {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneId || !token) {
      throw new Error(
        'WhatsApp env vars no configuradas. Setea WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN.',
      );
    }
    this.phoneId = phoneId;
    this.token = token;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    // Limpia el número: saca espacios, +, etc. Meta espera formato E.164 sin "+"
    const to = message.to.replace(/\D/g, '');
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneId}/messages`;

    // Texto compuesto: título en bold + body
    const text = `*${message.title}*\n${message.body}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text, preview_url: false },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          error: data?.error?.message ?? `HTTP ${res.status}`,
        };
      }

      const messageId = data?.messages?.[0]?.id;
      return { ok: true, channelId: messageId };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

// Singleton lazy
let _adapter: WhatsAppCloudAdapter | null = null;

export function getWhatsAppAdapter(): WhatsAppCloudAdapter {
  if (!_adapter) _adapter = new WhatsAppCloudAdapter();
  return _adapter;
}
