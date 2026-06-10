'use client';

import { useT } from '@/lib/i18n/client';
import { openMercadoPago } from '@/lib/paymentAssist';
import { MercadoPagoLogo } from '@/components/MercadoPagoLogo';

type Props = {
  className?: string;
  compact?: boolean;
  fullWidth?: boolean;
};

export const OpenMercadoPagoButton = ({
  className = '',
  compact = false,
  fullWidth = false,
}: Props) => {
  const { t } = useT();

  return (
    <button
      type="button"
      onClick={openMercadoPago}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg bg-[#009EE3] text-white font-medium',
        'hover:bg-[#0082c4] active:bg-[#0074b0] transition-colors',
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MercadoPagoLogo variant="icon" className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
      <span>{t.split.pay_open_mp}</span>
    </button>
  );
};
