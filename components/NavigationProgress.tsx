'use client';

// Barra de progreso en la parte superior cuando se navega entre rutas
// o cuando el router hace refresh. Estilo Linear / Vercel.

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const NavigationProgress = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cuando cambia la URL, completamos rápido.
    setActive(true);
    setProgress(85);
    const t1 = setTimeout(() => setProgress(100), 150);
    const t2 = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, searchParams]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      <div
        className="h-full kumo-gradient transition-[width] ease-out duration-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
