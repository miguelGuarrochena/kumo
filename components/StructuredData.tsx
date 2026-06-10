import type { Locale } from '@/lib/i18n/types';
import { localeTag } from '@/lib/i18n/locale';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';

const COPY = {
  es: {
    description:
      'App de finanzas personales gratis: gastos, vencimientos, recordatorios y WhatsApp. Escaneo de tickets con IA como complemento de pago opcional.',
    featureList: [
      'Carga de gastos con categorías',
      'OCR de tickets desde foto',
      'Recordatorios y calendario',
      'Lista de compras compartida',
      'Avisos automáticos por WhatsApp y push',
      'Espacios compartidos con familia',
      'Métricas y gráficos',
      'Multi-moneda con conversión',
    ],
  },
  en: {
    description:
      'Free personal finance app: expenses, due dates, reminders, and WhatsApp. Optional paid AI receipt scanning add-on.',
    featureList: [
      'Expense tracking with categories',
      'Receipt OCR from photos',
      'Reminders and calendar',
      'Shared shopping list',
      'Automatic WhatsApp and push alerts',
      'Shared workspaces for families',
      'Metrics and charts',
      'Multi-currency with conversion',
    ],
  },
} as const;

const buildData = (locale: Locale) => {
  const copy = COPY[locale];
  const langTag = localeTag(locale);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE}/#app`,
        name: 'Kumo',
        url: SITE,
        description: copy.description,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: [
          {
            '@type': 'Offer',
            name: 'Plan Free',
            price: '0',
            priceCurrency: 'ARS',
          },
          {
            '@type': 'Offer',
            name: 'Plan Pro',
            price: '3500',
            priceCurrency: 'ARS',
            eligibleDuration: { '@type': 'QuantitativeValue', value: '1', unitCode: 'MON' },
          },
        ],
        featureList: copy.featureList,
        inLanguage: ['es', 'en'],
      },
      {
        '@type': 'Organization',
        '@id': `${SITE}/#org`,
        name: 'Kumo',
        url: SITE,
        logo: `${SITE}/icon-512.png`,
        email: 'info@kumo-app.com',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: SITE,
        name: 'Kumo',
        publisher: { '@id': `${SITE}/#org` },
        inLanguage: langTag,
      },
    ],
  };
};

type Props = {
  locale?: Locale;
};

export const StructuredData = ({ locale = 'es' }: Props) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(buildData(locale)) }}
  />
);
