import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kumo · Tus gastos como una nube perfecta',
  description:
    'Organizá tus gastos personales, vencimientos, recordatorios y lista de compras. Con notificaciones por WhatsApp.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
      </body>
    </html>
  );
}
