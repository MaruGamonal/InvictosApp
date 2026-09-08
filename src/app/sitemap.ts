import type { MetadataRoute } from 'next';

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * T28 (`10`, sección 5) — la puerta de entrada siempre pública. `/` es
 * la pantalla de bienvenida (Ingresar / Crear cuenta / Descubrir sin
 * cuenta) y `/torneos` el destino de esa tercera opción — las dos son
 * URLs reales y alcanzables hoy.
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
  return [
    { url: base, changeFrequency: 'weekly' },
    { url: `${base}/torneos`, changeFrequency: 'daily' },
  ];
}
