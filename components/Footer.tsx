import Link from 'next/link';
import { CloudLogo } from './CloudLogo';

// Footer global — solo se muestra en desktop (lg+).
// Tres bloques: marca (izq), créditos (centro), legal/contacto (der).
// En mobile el espacio se reserva para el bottom nav (en la app) o para no
// distraer en el landing.

export function Footer({ variant = 'public' }: { variant?: 'public' | 'app' }) {
  return (
    <footer
      className={`hidden lg:block relative z-10 ${
        variant === 'app'
          ? 'mt-8 px-8 py-6 border-t border-slate-200/60 dark:border-slate-800/60'
          : 'max-w-6xl mx-auto px-6 py-8 border-t border-slate-200/60 dark:border-slate-800/60'
      }`}
    >
      <div className="grid grid-cols-3 items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
        {/* Izquierda — marca */}
        <div className="flex items-center gap-2">
          <CloudLogo className="w-5 h-5" />
          <span>© {new Date().getFullYear()} Kumo</span>
        </div>

        {/* Centro — créditos */}
        <div className="text-center">
          creado por{' '}
          <a
            href="https://miguelguarrochena.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            miguelguarrochena.dev
          </a>
        </div>

        {/* Derecha — enlaces */}
        <div className="flex items-center justify-end gap-5">
          <Link href="/legal/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">
            Privacidad
          </Link>
          <Link href="/legal/terms" className="hover:text-slate-700 dark:hover:text-slate-300">
            Términos
          </Link>
          <a
            href="mailto:info@kumo-app.com"
            className="hover:text-slate-700 dark:hover:text-slate-300"
          >
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}
