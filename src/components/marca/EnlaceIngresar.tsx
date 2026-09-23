'use client';

import Link from 'next/link';
import { useSesion } from '@/components/useSesion';
import styles from './MarcaInvicta.module.css';

/**
 * El descubrimiento se cachea con `CONTEXTO_PUBLICO` (`06`, D-90): el
 * servidor arma la misma respuesta para cualquiera, sin saber si quien
 * mira tiene sesión — por eso "Ingresar" no puede resolverse ahí. Se
 * pregunta en el cliente, compartiendo la consulta con `NavInferior` y
 * la campanita (`useSesion`).
 *
 * Reportado en vivo: un usuario logueado veía igual el link.
 */
export function EnlaceIngresar() {
  const autenticado = useSesion();

  if (autenticado !== false) return null;

  return (
    <Link href="/ingresar" className={styles.enlaceIngresar}>
      Ingresar
    </Link>
  );
}
