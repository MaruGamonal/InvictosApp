'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { BotonDeSalida, EnlaceDeSalida, PantallaDeMensaje } from '@/components/PantallaDeMensaje';

/**
 * Error inesperado en una pantalla, adentro del layout raíz: se
 * conservan las fuentes y los avisos. No existía, así que cualquier
 * error de una pantalla saltaba directo a `global-error.tsx`, que
 * reemplaza el layout entero.
 *
 * Reporta a Sentry, igual que `global-error.tsx`, y no muestra nada del
 * error. La
 * salida principal es reintentar: la mayoría de las veces es la red de
 * la cancha, y `reset()` vuelve a pedir la pantalla sin perder el lugar.
 */
export default function ErrorDePantalla({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <PantallaDeMensaje
      titulo="Algo salió mal"
      texto="No pudimos mostrar esta pantalla. Ya quedó registrado. Probá de nuevo en un momento."
      acciones={
        <>
          <BotonDeSalida onClick={reset}>Reintentar</BotonDeSalida>
          <EnlaceDeSalida href="/" variante="secundaria">
            Ir al inicio
          </EnlaceDeSalida>
        </>
      }
    />
  );
}
