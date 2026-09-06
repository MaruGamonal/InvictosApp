import * as Sentry from '@sentry/nextjs';

/**
 * T28 (`09`, sección 4) — inicializa Sentry en los dos runtimes donde
 * corre código de servidor (Node y Edge). Sin `SENTRY_DSN`, `Sentry.init`
 * no manda nada a ningún lado: el SDK queda inactivo en desarrollo sin
 * que haya que ramificar el código.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  }
}

/** Errores de React Server Components que Next.js no deja pasar por `comoRespuestaHttp`. */
export const onRequestError = Sentry.captureRequestError;
