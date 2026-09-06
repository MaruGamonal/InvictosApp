const { withSentryConfig } = require('@sentry/nextjs/config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
