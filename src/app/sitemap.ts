import type { MetadataRoute } from 'next';

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * T28 (`10`, sección 5) — la puerta de entrada siempre pública. `/` es
 * un redirect a `/torneos` (`06`, D-90: la ubicación es un contexto, no
 * una home aparte — ver `next.config.js`), así que solo hace falta
 * listar el destino.
 *
 * Las rutas dinámicas (`/torneo/[id]` y las que cuelgan de ahí,
 * `/equipo/[id]`, `/jugador/[id]`, `/organizador/[id]`) no están acá
 * todavía: listarlas a todas pide una consulta "todos los públicos" por
 * dominio que hoy no existe (la única lista pública que hay es
 * `buscarTorneos`, paginada por ciudad, no pensada para volcarse
 * entera a un sitemap) — se llegan igual por los links de esta página,
 * que es como Google las va a encontrar mientras tanto.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = URL_DEL_SITIO();
  return [{ url: `${base}/torneos`, changeFrequency: 'daily' }];
}
