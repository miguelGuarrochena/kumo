import { formatMoney, type Currency } from '@/lib/currency';
import type { Locale, Messages } from '@/lib/i18n/types';

export type PaymentAssistInfo = {
  creditorName: string;
  mpAlias?: string | null;
  mpPaymentLink?: string | null;
  amount: number;
  currency: string;
  concept?: string;
  locale?: Locale;
};

export const MERCADOPAGO_HOME = 'https://www.mercadopago.com.ar/';

export const buildPaymentCopyText = (info: PaymentAssistInfo, t: Messages): string => {
  const lines: string[] = [];
  if (info.mpAlias?.trim()) {
    lines.push(t.split.pay_copy_alias.replace('{alias}', info.mpAlias.trim()));
  }
  lines.push(
    t.split.pay_copy_amount.replace(
      '{amount}',
      formatMoney(info.amount, info.currency as Currency, info.locale ?? 'es'),
    ),
  );
  lines.push(t.split.pay_copy_to.replace('{name}', info.creditorName));
  if (info.concept?.trim()) {
    lines.push(t.split.pay_copy_concept.replace('{concept}', info.concept.trim()));
  }
  return lines.join('\n');
};

/** Texto para QR (alias + monto; escaneable o legible en pantalla). */
export const buildPaymentQrPayload = (info: PaymentAssistInfo): string => {
  const lines: string[] = [];
  if (info.mpAlias?.trim()) lines.push(info.mpAlias.trim());
  lines.push(String(info.amount));
  if (info.concept?.trim()) lines.push(info.concept.trim());
  return lines.join('\n');
};

export const buildPaymentWhatsAppText = (
  info: PaymentAssistInfo,
  extraLines: string[],
  t: Messages,
): string => {
  const lines = [...extraLines];
  if (info.mpAlias?.trim()) {
    lines.push('');
    lines.push(t.split.pay_wa_alias.replace('{alias}', info.mpAlias.trim()));
  }
  if (info.mpPaymentLink?.trim()) {
    lines.push(t.split.pay_wa_link.replace('{link}', info.mpPaymentLink.trim()));
  }
  return lines.join('\n');
};

export const openMercadoPago = (): void => {
  if (typeof window === 'undefined') return;
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (mobile) {
    window.location.href = 'mercadopago://';
    window.setTimeout(() => {
      window.open(MERCADOPAGO_HOME, '_blank', 'noopener,noreferrer');
    }, 600);
  } else {
    window.open(MERCADOPAGO_HOME, '_blank', 'noopener,noreferrer');
  }
};

export const openPaymentLink = (url: string): void => {
  if (typeof window === 'undefined') return;
  const trimmed = url.trim();
  if (!trimmed) return;
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  window.open(href, '_blank', 'noopener,noreferrer');
};

export const copyPaymentDetails = async (
  info: PaymentAssistInfo,
  t: Messages,
): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(buildPaymentCopyText(info, t));
    return true;
  } catch {
    return false;
  }
};

export const hasPaymentAssist = (info: PaymentAssistInfo): boolean =>
  info.amount > 0 && !!(info.mpAlias?.trim() || info.mpPaymentLink?.trim());
