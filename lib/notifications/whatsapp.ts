// WhatsApp Cloud API adapter (Meta Graph).
//
// Templates en Meta (Utility, aprobadas):
//   - kumo_vencimiento (es): {{1}} descripción, {{2}} fecha, {{3}} monto
//   - kumo_reminder    (es): {{1}} tipo (Turno médico / Cumpleaños / Recordatorio),
//                            {{2}} título, {{3}} cuándo

import type { NotificationAdapter, NotificationMessage, NotificationResult } from './types';

const GRAPH_VERSION = 'v21.0';

type TemplateParam = { type: 'text'; text: string };

function buildExpenseParams(message: NotificationMessage): TemplateParam[] {
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
  // title: "Turno médico · <título> · Kumo"
  // body:  "Es mañana (2025-06-09)" o con greeting "Hola Juan, te aviso..."
  const titleMatch = message.title.match(/^(.+?) · (.+?) · Kumo$/);
  const tipo   = titleMatch?.[1] ?? 'Recordatorio';
  const titulo = titleMatch?.[2] ?? message.title;
  const cuando = message.body.replace(/^Hola .+?, te aviso de parte de Kumo: /, '');
  return [
    { type: 'text', text: tipo },
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