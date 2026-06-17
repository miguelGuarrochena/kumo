import type { Metadata, Viewport } from 'next';
import { ThemeToaster } from '@/components/ThemeToaster';
import { CookieBanner } from '@/components/CookieBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import { PostHogProvider } from '@/components/PostHogProvider';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale, getMessages } from '@/lib/i18n/server';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// Metadata dinámica: title/description/OG/Twitter cambian según el locale
// activo (cookie 'locale'). Así el SEO y los previews al compartir el link
// quedan en el idioma que el user eligió.
export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const m = await getMessages();
  const seo = m.seo;

  const keywords =
    locale === 'en'
      ? ['personal finance', 'expenses', 'budget', 'due dates', 'reminders', 'WhatsApp', 'receipt OCR', 'finance']
      : ['finanzas personales', 'gastos', 'presupuesto', 'vencimientos', 'recordatorios', 'WhatsApp', 'OCR ticket', 'budget app', 'finance'];

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: seo.site_title,
      template: '%s · Kumo',
    },
    description: seo.site_description,
    keywords,
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
      locale: locale === 'en' ? 'en_US' : 'es_AR',
      url: appUrl,
      siteName: 'Kumo',
      title: seo.site_title,
      description: seo.site_description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: seo.og_image_alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.site_title,
      description: seo.site_description_short,
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

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <PostHogProvider>
          <ThemeProvider>
            <I18nProvider locale={locale}>
              <ServiceWorkerRegister />
              {children}
              <CookieBanner />
              <ThemeToaster />
            </I18nProvider>
          </ThemeProvider>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
