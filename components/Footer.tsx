'use client';

import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { useT } from '@/lib/i18n/client';

type Props = {
  variant?: 'public' | 'app';
};

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? 'https://cafecito.app/miguelguarrochena';

export const Footer = ({ variant = 'public' }: Props) => {
  const { t } = useT();

  return (
    <footer
      className={`hidden lg:block relative z-10 ${
        variant === 'app'
          ? 'mt-8 px-8 py-6 border-t border-slate-200/60 dark:border-slate-800/60'
          : 'max-w-6xl mx-auto px-6 py-8 border-t border-slate-200/60 dark:border-slate-800/60'
      }`}
    >
      <div className="grid grid-cols-3 items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
        <Link
          href={variant === 'app' ? '/dashboard' : '/'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <CloudLogo className="w-5 h-5" />
          <span>© {new Date().getFullYear()} Kumo</span>
        </Link>

        <div className="text-center">
          {t.footer.createdBy}{' '}
          <a
            href="https://miguelguarrochena.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            miguelguarrochena.dev
          </a>
        </div>

        <div className="flex items-center justify-end gap-5">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            title={t.footer.cafecito_title}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{t.footer.cafecito}</span>
          </a>
          <Link href="/legal/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">
            {t.footer.privacy}
          </Link>
          <Link href="/legal/terms" className="hover:text-slate-700 dark:hover:text-slate-300">
            {t.footer.terms}
          </Link>
          <a
            href="mailto:info@kumo-app.com"
            className="hover:text-slate-700 dark:hover:text-slate-300"
          >
            {t.footer.contact}
          </a>
        </div>
      </div>
    </footer>
  );
};
