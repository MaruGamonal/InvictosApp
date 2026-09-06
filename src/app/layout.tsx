import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: NOMBRE_PRODUCTO,
  description: 'Plataforma de gestión y descubrimiento de torneos de fútbol amateur.',
  /** apple-touch-icon (T28, `09` 8.1): iOS no lee el manifiesto, así que necesita su propio link. */
  icons: {
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

/**
 * Sin esto, un navegador móvil renderiza a un ancho de escritorio
 * (~980px) y recién después lo achica — exactamente al revés de lo que
 * pide `08`, sección 10: el visitante sin cuenta, con datos móviles,
 * "parado en la calle", es el actor cuyo primer segundo de pantalla más
 * importa. No había hecho falta hasta T21 porque ninguna pantalla
 * anterior era la que ese visitante mira primero.
 *
 * `themeColor` (T28, `09` 8.1) pinta la barra de estado del navegador
 * y la pantalla de carga de la PWA instalada con el ink del Design
 * System, en vez del blanco por defecto.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1720',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
