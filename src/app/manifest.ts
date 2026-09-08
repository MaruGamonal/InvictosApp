import type { MetadataRoute } from 'next';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';

/**
 * T28 (`09`, 8.1) — sin esto no hay nada que instalar: es el requisito
 * mínimo para que el navegador ofrezca "Agregar a la pantalla de
 * inicio", que en iOS es lo que habilita el push más adelante.
 *
 * Los íconos salen del isotipo real de la marca (`public/imagenes/logo.png`),
 * recortado al glifo — el nombre completo no entra legible a 192px.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_PRODUCTO,
    short_name: NOMBRE_PRODUCTO,
    description: 'Plataforma de gestión y descubrimiento de torneos de fútbol amateur.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1720',
    theme_color: '#0e1720',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
