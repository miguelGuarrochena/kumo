import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/ThemeProvider';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            theme="system"
            toastOptions={{
              classNames: {
                toast: 'rounded-xl border shadow-lg',
              },
            }}
          />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
