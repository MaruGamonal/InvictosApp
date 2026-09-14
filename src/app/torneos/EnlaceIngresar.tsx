'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './pagina.module.css';

/**
 * `/torneos` es una página cacheada con `CONTEXTO_PUBLICO` (`06`,
 * D-90): el servidor arma la misma respuesta para cualquiera, sin
 * saber si quien mira tiene sesión — por eso "Ingresar" no puede
 * resolverse ahí. Se pregunta en el cliente, mismo patrón que
 * `NavInferior` (`GET /api/mi-usuario`).
 *
 * Reportado en vivo: un usuario logueado veía igual el link.
 */
export function EnlaceIngresar() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/mi-usuario')
      .then((respuesta) => {
        if (!cancelado) setAutenticado(respuesta.ok);
      })
      .catch(() => {
        if (!cancelado) setAutenticado(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (autenticado !== false) return null;

  return (
    <Link href="/ingresar" className={styles.enlaceIngresar}>
      Ingresar
    </Link>
  );
}
