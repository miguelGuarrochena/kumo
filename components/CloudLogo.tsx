// Logo de Kumo: nubecita con gradient indigo/violeta.

export function CloudLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" fill="none" className={className} aria-label="Kumo">
      <defs>
        <linearGradient id="kumoGrad" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="kumoHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M30 84 a18 18 0 0 1 0-36 a14 14 0 0 1 4-9 a20 20 0 0 1 36 4 a16 16 0 0 1 24 13 a16 16 0 0 1 4 31 z"
        fill="url(#kumoGrad)"
      />
      <path
        d="M30 84 a18 18 0 0 1 0-36 a14 14 0 0 1 4-9 a20 20 0 0 1 36 4 a16 16 0 0 1 24 13 a16 16 0 0 1 4 31 z"
        fill="url(#kumoHighlight)"
      />
      <circle cx="44" cy="60" r="2" fill="#ffffff" opacity="0.35" />
      <circle cx="78" cy="56" r="2.5" fill="#ffffff" opacity="0.3" />
    </svg>
  );
}
