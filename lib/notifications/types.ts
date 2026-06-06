// Interface común para todos los canales de notificación.
// Hoy: Twilio WhatsApp. Mañana podemos sumar Telegram, Email, Push sin tocar nada más.

export type NotificationMessage = {
  to: string; // número o identificador del destinatario
  title: string;
  body: string;
  lang?: 'es' | 'en_US';
  // metadatos opcionales (referencia al gasto, recordatorio, etc.)
  ref?: { type: 'expense' | 'reminder'; id: string };
};

export type NotificationResult = {
  ok: boolean;
  channelId?: string; // ID que devuelve el proveedor (sid de Twilio, msg_id de Telegram, etc.)
  error?: string;
};

export interface NotificationAdapter {
  readonly id: string; // 'whatsapp', 'telegram', 'email'
  send(message: NotificationMessage): Promise<NotificationResult>;
}
