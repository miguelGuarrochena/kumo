const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kumo-app.com';

const data = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE}/#app`,
      name: 'Kumo',
      url: SITE,
      description:
        'App de finanzas personales en español: gastos, vencimientos, recordatorios y avisos por WhatsApp. Multi-usuario con espacios compartidos. Gratis los primeros 90 días.',
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
      inLanguage: 'es-AR',
    },
  ],
};

export const StructuredData = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);
