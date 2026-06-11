import { isWhatsAppConfigured } from '@/lib/notifications/whatsapp';
import type { PlanProduct } from '@/lib/plans';

/** WA y combo solo se venden con credenciales activas y sin flag de revisión Meta. */
export const isWaBillingEnabled = (): boolean => {
  if (process.env.NEXT_PUBLIC_WHATSAPP_PENDING === 'true') return false;
  if (typeof window === 'undefined') {
    return isWhatsAppConfigured();
  }
  return true;
};

export const availableCheckoutProducts = (): PlanProduct[] =>
  isWaBillingEnabled() ? ['ocr', 'wa', 'bundle'] : ['ocr'];
