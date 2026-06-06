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
// Templates requeridas en Meta (Utilidad, aprobadas):
//   - kumo_vencimiento (es / en_US): parámetros {{1}} descripción, {{2}} fecha, {{3}} monto
//   - kumo_reminder (es / en_US): parámetros {{1}} emoji, {{2}} título, {{3}} cuándo

import type { NotificationAdapter, NotificationMessage, NotificationResult } from './types';

const GRAPH_VERSION = 'v21.0';

type TemplateParam = { type: 'text'; text: string };

function buildExpenseParams(message: NotificationMessage): TemplateParam[] {
  // title: "🌥️ Vencimiento próximo · Kumo"  (no se usa en template)
  // body:  "Tarjeta Visa vence el 2025-06-09.\nMonto: 5000 ARS"
  const descripcion = message.body.match(/^(.+?) vence/)?.[1] ?? message.title;
  const fecha       = message.body.match(/vence el (.+?)\./)?.[1] ?? '';
  const monto       = message.body.match(/Monto: (.+)/)?.[1] ?? '';
  return [
    { type: 'text', text: descripcion },
    { type: 'text', text: fecha },
    { type: 'text', text: monto },
  ];
}

function buildReminderParams(message: NotificationMessage): TemplateParam[] {
  // title: "🏥 Turno médico · Kumo"
  // body:  "Es mañana (2025-06-09)"  ó  "Hola Juan, te aviso de parte de Kumo: Es mañana..."
  const emoji  = message.title.match(/^(\S+)/)?.[1] ?? '🔔';
  const titulo = message.title.match(/^\S+\s+(.+?)\s+·\s+Kumo$/)?.[1] ?? message.title;
  // Si el body tiene el greeting de Kumo, lo sacamos para quedarnos solo con el cuándo
  const cuando = message.body.replace(/^Hola .+?, te aviso de parte de Kumo: /, '');
  return [
    { type: 'text', text: emoji },
    { type: 'text', text: titulo },
    { type: 'text', text: cuando },
  ];
}

export class WhatsAppCloudAdapter implements NotificationAdapter {
  readonly id = 'whatsapp';
  private phoneId: string;
  private token: string;

  constructor() {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token   = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneId || !token) {
      throw new Error(
        'WhatsApp env vars no configuradas. Setea WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN.',
      );
    }
    this.phoneId = phoneId;
    this.token   = token;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    // Limpia el número: saca espacios, +, etc. Meta espera formato E.164 sin "+"
    const to   = message.to.replace(/\D/g, '');
    const url  = `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneId}/messages`;
    const lang = message.lang ?? 'es';

    const isExpense      = message.ref?.type === 'expense';
    const templateName   = isExpense ? 'kumo_vencimiento' : 'kumo_reminder';
    const params         = isExpense
      ? buildExpenseParams(message)
      : buildReminderParams(message);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name:       templateName,
            language:   { code: lang },
            components: [{ type: 'body', parameters: params }],
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok:    false,
          error: data?.error?.message ?? `HTTP ${res.status}`,
        };
      }

      return { ok: true, channelId: data?.messages?.[0]?.id };
    } catch (error) {
      return {
        ok:    false,
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