import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getSubscription } from '@/lib/subscription';

export const TrialBanner = async () => {
  const sub = await getSubscription();

  if (sub.status === 'active') return null;
  if (sub.status === 'trialing' && sub.daysLeftInTrial !== null && sub.daysLeftInTrial > 7) {
    return null;
  }

  const isTrial = sub.status === 'trialing' && sub.daysLeftInTrial !== null;
  const isExpired = !isTrial && sub.tier === 'free';

  return (
    <Link
      href="/settings#plan"
      className="block px-4 py-2 text-sm text-center text-amber-800 dark:text-amber-100 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200/60 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
    >
      <Sparkles className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
      {isTrial && sub.daysLeftInTrial! > 1 && (
        <>Te quedan <strong>{sub.daysLeftInTrial} días</strong> de prueba gratis. Pasate a Pro por USD 3/mes.</>
      )}
      {isTrial && sub.daysLeftInTrial === 1 && (
        <>Tu prueba termina <strong>mañana</strong>. Suscribite por USD 3/mes para no perder el OCR y WhatsApp.</>
      )}
      {isExpired && (
        <>Tu prueba terminó. <strong>Pasate a Pro</strong> por USD 3/mes para reactivar OCR y notificaciones por WhatsApp.</>
      )}
    </Link>
  );
};
