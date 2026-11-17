import type { MetadataRoute } from 'next';
import { seIndexa } from '@/lib/ambiente';

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * T28 (`10`, sección 5) — deja indexar las ocho rutas públicas y nada
 * de `/api/*`, que no es contenido para un buscador.
 *
 * **En el ambiente de pruebas, nada.** Y sin anunciar el sitemap, que
 * sería señalarle al buscador exactamente lo que no queremos que mire.
 * El porqué está en `seIndexa`.
 */
export default function robots(): MetadataRoute.Robots {
  if (!seIndexa()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${URL_DEL_SITIO()}/sitemap.xml`,
  };
}
