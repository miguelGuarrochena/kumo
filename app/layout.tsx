import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kumo · Tus gastos como una nube perfecta',
  description:
    'Organizá tus gastos personales, vencimientos, recordatorios y lista de compras. Con notificaciones por WhatsApp.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
