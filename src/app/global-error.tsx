'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { BotonDeSalida, EnlaceDeSalida, PantallaDeMensaje } from '@/components/PantallaDeMensaje';
import { clasesDeFuentes } from './fuentes';
import './globals.css';

/**
 * T28 (`09`, sección 4) — reemplaza el layout raíz cuando el error es
 * del propio layout (los de una pantalla los atrapa `error.tsx`, que lo
 * conserva), así que define su propio `<html>`/`<body>` y trae sus
 * fuentes. Es la contraparte, para el árbol de React, de lo que
 * `comoRespuestaHttp` ya hace en las rutas de API: reporta a Sentry con
 * contexto y muestra un mensaje genérico, sin exponer nada del error.
 *
 * Antes decía "Algo salió mal" y nada más: sin forma de reintentar ni de
 * volver (`05`, principio 5).
 */
export default function GlobalError({
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
    <html lang="es" className={clasesDeFuentes}>
      <body>
        <PantallaDeMensaje
          titulo="Algo salió mal"
          texto="No pudimos abrir la aplicación. Ya quedó registrado. Probá de nuevo en un momento."
          acciones={
            <>
              <BotonDeSalida onClick={reset}>Reintentar</BotonDeSalida>
              <EnlaceDeSalida href="/" variante="secundaria">
                Ir al inicio
              </EnlaceDeSalida>
            </>
          }
        />
      </body>
    </html>
  );
}
