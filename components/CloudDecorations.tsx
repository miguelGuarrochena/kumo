'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// Decoraciones de fondo: nubes blancas espumosas (light) o cielo nocturno con sparkles (dark).

export function CloudDecorations() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return resolvedTheme === 'dark' ? <StarrySky /> : <FluffyClouds />;
}

// =====================================================================
// LIGHT: nubes blancas espumosas en posiciones fijas con sway sutil
// =====================================================================
function FluffyClouds() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <FluffyCloud className="absolute top-[5%]  left-[8%]   w-72 cloud-sway-a" opacity={0.95} delay="-10s"  />
      <FluffyCloud className="absolute top-[14%] left-[58%]  w-56 cloud-sway-b" opacity={0.85} delay="-40s"  />
      <FluffyCloud className="absolute top-[32%] left-[28%]  w-64 cloud-sway-c" opacity={0.9}  delay="-20s"  />
      <FluffyCloud className="absolute top-[48%] left-[72%]  w-72 cloud-sway-a" opacity={0.8}  delay="-70s"  />
      <FluffyCloud className="absolute top-[65%] left-[10%]  w-60 cloud-sway-b" opacity={0.9}  delay="-50s"  />
      <FluffyCloud className="absolute top-[78%] left-[48%]  w-72 cloud-sway-c" opacity={0.85} delay="-90s"  />
      <FluffyCloud className="absolute top-[88%] left-[82%]  w-52 cloud-sway-a" opacity={0.75} delay="-30s"  />
    </div>
  );
}

function FluffyCloud({
  className,
  opacity = 0.9,
  delay = '0s',
}: {
  className?: string;
  opacity?: number;
  delay?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={className}
      style={{ animationDelay: delay, opacity }}
      fill="white"
    >
      <ellipse cx="120" cy="88" rx="105" ry="20" />
      <ellipse cx="55"  cy="72" rx="32" ry="26" />
      <ellipse cx="88"  cy="55" rx="34" ry="32" />
      <ellipse cx="125" cy="48" rx="38" ry="35" />
      <ellipse cx="165" cy="55" rx="32" ry="30" />
      <ellipse cx="195" cy="72" rx="28" ry="24" />
      <ellipse cx="100" cy="38" rx="18" ry="14" />
      <ellipse cx="145" cy="35" rx="20" ry="15" />
    </svg>
  );
}

// =====================================================================
// DARK: cielo estrellado con sparkles estilo Claude
// =====================================================================
function StarrySky() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.12), transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.08), transparent 60%)
          `,
        }}
      />

      {SPARKLE_POSITIONS.map((s, i) => (
        <Sparkle key={i} {...s} />
      ))}
    </div>
  );
}

function Sparkle({
  top,
  left,
  size,
  delay,
  duration,
  opacity,
}: {
  top: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}) {
  return (
    <svg
      className="absolute star-twinkle"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        filter: size > 12 ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : undefined,
      }}
      viewBox="0 0 24 24"
      fill="white"
    >
      <path d="M12 0 C12.5 7.5, 16.5 11.5, 24 12 C16.5 12.5, 12.5 16.5, 12 24 C11.5 16.5, 7.5 12.5, 0 12 C7.5 11.5, 11.5 7.5, 12 0 Z" />
    </svg>
  );
}

const SPARKLE_POSITIONS = [
  { top: 6, left: 12, size: 14, delay: 0, duration: 4, opacity: 0.85 },
  { top: 9, left: 32, size: 8, delay: 0.6, duration: 3, opacity: 0.6 },
  { top: 14, left: 52, size: 18, delay: 1.2, duration: 5, opacity: 0.9 },
  { top: 11, left: 72, size: 10, delay: 0.3, duration: 3.5, opacity: 0.7 },
  { top: 18, left: 88, size: 12, delay: 1.8, duration: 4, opacity: 0.8 },
  { top: 24, left: 8, size: 8, delay: 2.2, duration: 3, opacity: 0.55 },
  { top: 28, left: 28, size: 16, delay: 0.9, duration: 4.5, opacity: 0.9 },
  { top: 32, left: 48, size: 10, delay: 1.5, duration: 3.5, opacity: 0.7 },
  { top: 36, left: 68, size: 14, delay: 0.4, duration: 4, opacity: 0.85 },
  { top: 30, left: 85, size: 9, delay: 2.0, duration: 3, opacity: 0.6 },
  { top: 42, left: 18, size: 11, delay: 1.0, duration: 3.5, opacity: 0.75 },
  { top: 45, left: 42, size: 20, delay: 0.7, duration: 5, opacity: 0.95 },
  { top: 48, left: 62, size: 8, delay: 1.4, duration: 3, opacity: 0.55 },
  { top: 52, left: 80, size: 13, delay: 2.1, duration: 4, opacity: 0.8 },
  { top: 58, left: 6, size: 10, delay: 0.5, duration: 3.5, opacity: 0.65 },
  { top: 62, left: 26, size: 14, delay: 1.7, duration: 4.5, opacity: 0.85 },
  { top: 65, left: 50, size: 9, delay: 0.2, duration: 3, opacity: 0.6 },
  { top: 68, left: 70, size: 17, delay: 1.1, duration: 5, opacity: 0.9 },
  { top: 72, left: 92, size: 8, delay: 1.9, duration: 3, opacity: 0.55 },
  { top: 78, left: 14, size: 12, delay: 0.8, duration: 4, opacity: 0.75 },
  { top: 82, left: 38, size: 10, delay: 1.6, duration: 3.5, opacity: 0.7 },
  { top: 86, left: 58, size: 15, delay: 2.3, duration: 4.5, opacity: 0.85 },
  { top: 84, left: 78, size: 9, delay: 0.4, duration: 3, opacity: 0.6 },
  { top: 90, left: 24, size: 11, delay: 1.3, duration: 3.5, opacity: 0.7 },
  { top: 94, left: 48, size: 13, delay: 0.6, duration: 4, opacity: 0.8 },
];
