export type NotificationMessage = {
  to: string;
  title: string;
  body: string;
  lang?: 'es' | 'en_US';
  ref?: { type: 'expense' | 'reminder'; id: string };
};

export type NotificationResult = {
  ok: boolean;
  channelId?: string;
  error?: string;
};

export interface NotificationAdapter {
  readonly id: string; // 'whatsapp', 'telegram', 'email'
  send(message: NotificationMessage): Promise<NotificationResult>;
}
