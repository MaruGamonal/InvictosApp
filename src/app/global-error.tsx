'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import './globals.css';

/**
 * T28 (`09`, sección 4) — reemplaza el layout raíz cuando un componente
 * de servidor no captura su propio error, así que define su propio
 * `<html>`/`<body>`. Es la contraparte, para el árbol de React, de lo
 * que `comoRespuestaHttp` ya hace en las rutas de API: reporta a Sentry
 * con contexto y muestra un mensaje genérico, sin exponer nada del error.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ink-900)',
          color: 'var(--blanco)',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gris-claro-sobre-oscuro)' }}>
            {NOMBRE_PRODUCTO}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.125rem' }}>
            Algo salió mal. Ya quedó registrado.
          </p>
        </div>
      </body>
    </html>
  );
}
