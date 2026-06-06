import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { CookieBanner } from '@/components/CookieBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import { PostHogProvider } from '@/components/PostHogProvider';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale } from '@/lib/i18n/server';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Kumo · Tus gastos como una nube perfecta',
    template: '%s · Kumo',
  },
  description:
    'Organizá tus gastos personales, vencimientos, recordatorios y lista de compras. Con notificaciones por WhatsApp y OCR de tickets.',
  keywords: [
    'finanzas personales',
    'gastos',
    'presupuesto',
    'vencimientos',
    'recordatorios',
    'WhatsApp',
    'OCR ticket',
    'budget app',
    'finance',
  ],
  authors: [{ name: 'Kumo' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: appUrl,
    siteName: 'Kumo',
    title: 'Kumo · Tus gastos como una nube perfecta',
    description:
      'Organizá tus gastos personales, vencimientos, recordatorios y lista de compras. Notificaciones por WhatsApp.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kumo · Tus gastos como una nube perfecta',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kumo · Tus gastos como una nube perfecta',
    description:
      'Organizá tus gastos, vencimientos y recordatorios. Con notificaciones por WhatsApp.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: appUrl,
    languages: {
      'es-AR': appUrl,
      'en-US': appUrl,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kumo',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1126' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Pre-hidratación: aplica la clase `dark` antes del primer paint
            para evitar el flash light → dark. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <PostHogProvider>
          <ThemeProvider>
            <I18nProvider locale={locale}>
              <ServiceWorkerRegister />
              {children}
              <CookieBanner />
              <Toaster
                position="top-right"
                mobileOffset={{ top: 16, right: 16, left: 16 }}
                offset={{ top: 24, right: 24 }}
                richColors
                closeButton
                theme="system"
                visibleToasts={3}
                duration={4000}
                toastOptions={{
                  classNames: {
                    toast: 'kumo-toast',
                    title: 'kumo-toast-title',
                    description: 'kumo-toast-desc',
                  },
                }}
              />
            </I18nProvider>
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
