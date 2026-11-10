import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { ProveedorAvisos } from '@/components/avisos/Avisos';
import { BandaDeAmbiente } from '@/components/BandaDeAmbiente';
import { clasesDeFuentes } from './fuentes';
import './globals.css';

export const metadata: Metadata = {
  /**
   * La base de las URL absolutas de la metadata — la imagen al compartir
   * un torneo, sobre todo. Sin esto Next arma `http://localhost:…`, y
   * WhatsApp no puede bajar esa imagen. Es la misma variable que usa el
   * resto de la app para los links que salen afuera.
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: NOMBRE_PRODUCTO,
  description: 'Torneos de fútbol amateur: encontralos, sumate y seguí la tabla.',
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
    <html lang="es" className={clasesDeFuentes}>
      <body>
        {/* Arriba de todo, antes que cualquier pantalla: en el ambiente
            de pruebas avisa que los datos no son reales. En producción
            no renderiza nada. */}
        <BandaDeAmbiente />
        {/* Los avisos de una acción salen siempre del mismo lugar, en
            cualquier pantalla, así que el proveedor vive acá arriba. */}
        <ProveedorAvisos>{children}</ProveedorAvisos>
        <Analytics />
      </body>
    </html>
  );
}
