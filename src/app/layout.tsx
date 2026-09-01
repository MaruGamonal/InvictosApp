import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
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
  title: 'INVICTOS',
  description: 'Plataforma de gestión y descubrimiento de torneos de fútbol amateur.',
};

/**
 * Sin esto, un navegador móvil renderiza a un ancho de escritorio
 * (~980px) y recién después lo achica — exactamente al revés de lo que
 * pide `08`, sección 10: el visitante sin cuenta, con datos móviles,
 * "parado en la calle", es el actor cuyo primer segundo de pantalla más
 * importa. No había hecho falta hasta T21 porque ninguna pantalla
 * anterior era la que ese visitante mira primero.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
