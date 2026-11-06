const { withSentryConfig } = require('@sentry/nextjs/config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Las fuentes que lee la imagen para compartir un torneo
   * (`src/app/torneo/[id]/(publico)/_imagenParaCompartir.tsx`). Se leen
   * con `readFile` y un nombre armado en tiempo de ejecución, así que el
   * rastreo de archivos de Next no las ve y no las sube con la función:
   * en Vercel la imagen fallaría por un archivo que no está, aunque en
   * local funcione.
   */
  outputFileTracingIncludes: {
    '/torneo/[id]/**/*': ['./assets/fuentes/*.ttf'],
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
