const { withSentryConfig } = require('@sentry/nextjs/config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * La ubicación es un contexto, no un filtro (`06`, D-90): "la
   * aplicación abre mostrando los torneos de esa ciudad, sin que pida
   * nada" — que es exactamente lo que ya hace `/torneos` (pide la
   * ciudad recién ahí si hace falta). No hay una home distinta que
   * construir; la raíz solo tiene que apuntar para allá.
   */
  async redirects() {
    return [{ source: '/', destination: '/torneos', permanent: false }];
  },
};

/**
 * T28 (`09`, sección 4) — sin `SENTRY_AUTH_TOKEN` (no está en la lista de
 * variables que pide `pasos-infraestructura-T28.md`), así que la subida
 * de sourcemaps queda desactivada explícitamente en vez de fallar el
 * build buscando credenciales que no vamos a pedir.
 */
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});
