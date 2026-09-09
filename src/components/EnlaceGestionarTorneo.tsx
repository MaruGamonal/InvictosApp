'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './EnlaceGestionarTorneo.module.css';

export interface EnlaceGestionarTorneoProps {
  torneoId: string;
}

/**
 * "Gestionar torneo" en la ficha pública — cacheada por evento y
 * cualquiera para cualquier visitante (D-04b), así que no puede saber
 * si quien la mira administra la organización. Nace oculto y se
 * muestra recién si `GET /api/torneos/mi-rol` confirma, con la sesión
 * real, que puede gestionarlo. Mismo patrón que `EnlaceGestionarEquipo`
 * — ese mismo bug (enlace visible para cualquiera) ya se reportó una
 * vez con equipos.
 */
export function EnlaceGestionarTorneo({ torneoId }: EnlaceGestionarTorneoProps) {
  const [puedeGestionar, setPuedeGestionar] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/torneos/mi-rol?torneoId=${torneoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (!cancelado && cuerpo?.data?.puedeGestionar) setPuedeGestionar(true);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [torneoId]);

  if (!puedeGestionar) return null;

  return (
    <Link href={`/torneo/${torneoId}/gestionar`} className={styles.enlace}>
      Gestionar torneo
    </Link>
  );
}
