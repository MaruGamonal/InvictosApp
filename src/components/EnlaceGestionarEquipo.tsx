'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './EnlaceGestionarEquipo.module.css';

export interface EnlaceGestionarEquipoProps {
  equipoId: string;
}

/**
 * "Gestionar equipo" en la ficha pública (`/equipo/[id]`) — esa página
 * está cacheada por evento y es igual para cualquier visitante (D-04b),
 * así que no puede saber si quien la mira tiene vínculo con el equipo.
 * Nace oculto y se muestra recién si `GET /api/equipos/mi-rol` confirma,
 * con la sesión real, que hay algún rol activo — capitana, delegada,
 * jugadora o cuerpo técnico: cualquiera de ellos puede entrar a
 * `/gestionar` aunque sea solo para "Dejar equipo".
 */
export function EnlaceGestionarEquipo({ equipoId }: EnlaceGestionarEquipoProps) {
  const [esIntegrante, setEsIntegrante] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/equipos/mi-rol?equipoId=${equipoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (!cancelado && (cuerpo?.data?.roles?.length ?? 0) > 0) setEsIntegrante(true);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [equipoId]);

  if (!esIntegrante) return null;

  return (
    <Link href={`/equipo/${equipoId}/gestionar`} className={styles.enlace}>
      Gestionar equipo
    </Link>
  );
}
