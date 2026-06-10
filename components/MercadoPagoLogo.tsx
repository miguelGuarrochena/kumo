type Props = {
  className?: string;
  /** icon = solo isotipo · full = isotipo + wordmark */
  variant?: 'icon' | 'full';
};

const MP_BLUE = '#009EE3';

const HandshakeIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    aria-hidden
  >
    <circle cx="24" cy="24" r="24" fill={MP_BLUE} />
    <path
      d="M14 26.5c0-2.2 1.8-4 4-4h2.2l3.3-3.8a2.2 2.2 0 0 1 3.3 0l1.6 1.8 4.2-2.4a2.4 2.4 0 0 1 3.1.9l2.2 3.8"
      stroke="#FFE600"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 28.5l4.8 4.2a2.6 2.6 0 0 0 3.4 0l2.4-2.1 3.1 2.7a2.6 2.6 0 0 0 3.3 0l3.5-3.2"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 22.5v8.5M30 20v10"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

const Wordmark = () => (
  <span
    className="font-semibold tracking-tight lowercase leading-none text-[#009EE3] dark:text-[#33b5f0]"
    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
  >
    mercado pago
  </span>
);

export const MercadoPagoLogo = ({ className = 'w-6 h-6', variant = 'icon' }: Props) => {
  if (variant === 'full') {
    return (
      <span
        className="inline-flex items-center gap-2"
        role="img"
        aria-label="Mercado Pago"
      >
        <HandshakeIcon className={className} />
        <Wordmark />
      </span>
    );
  }

  return (
    <span className="inline-flex" role="img" aria-label="Mercado Pago">
      <HandshakeIcon className={className} />
    </span>
  );
};
