// Logo de Kumo: nubecita outline con gradient pastel (azul → rosa).
// Estilo refinado, minimalista, friendly.

export function CloudLogo({
  className = 'w-8 h-8',
  withWordmark = false,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  if (withWordmark) {
    return (
      <svg viewBox="0 0 200 220" fill="none" className={className} aria-label="Kumo">
        <Defs />
        <CloudPath />
        <text
          x="100"
          y="195"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontSize="36"
          fontWeight="400"
          letterSpacing="6"
          fill="#7c6fb1"
        >
          Kumo
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 130" fill="none" className={className} aria-label="Kumo">
      <Defs />
      <CloudPath />
    </svg>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="kumoStroke" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a5b4fc" />
        <stop offset="50%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor="#fbcfe8" />
      </linearGradient>
    </defs>
  );
}

function CloudPath() {
  return (
    <path
      d="M50 100
         a26 26 0 0 1 -2 -52
         a18 18 0 0 1 6 -14
         a30 30 0 0 1 54 4
         a22 22 0 0 1 36 18
         a22 22 0 0 1 6 44
         z"
      stroke="url(#kumoStroke)"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}
