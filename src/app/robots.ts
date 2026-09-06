import type { MetadataRoute } from 'next';

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * T28 (`10`, sección 5) — deja indexar las ocho rutas públicas y nada
 * de `/api/*`, que no es contenido para un buscador.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${URL_DEL_SITIO()}/sitemap.xml`,
  };
}
