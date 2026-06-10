type Props = {
  className?: string;
  /** icon = solo isotipo · full = isotipo + wordmark */
  variant?: 'icon' | 'full';
};

const MP_LOGO = '/mercadopago.png';

const Wordmark = () => (
  <span
    className="font-semibold tracking-tight lowercase leading-none text-[#009EE3] dark:text-[#33b5f0]"
    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
  >
    mercado pago
  </span>
);

const Icon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={MP_LOGO}
    alt=""
    aria-hidden
    className={`object-contain shrink-0 ${className}`}
  />
);

export const MercadoPagoLogo = ({ className = 'w-6 h-6', variant = 'icon' }: Props) => {
  if (variant === 'full') {
    return (
      <span
        className="inline-flex items-center gap-2"
        role="img"
        aria-label="Mercado Pago"
      >
        <Icon className={className} />
        <Wordmark />
      </span>
    );
  }

  return (
    <span className="inline-flex" role="img" aria-label="Mercado Pago">
      <Icon className={className} />
    </span>
  );
};
