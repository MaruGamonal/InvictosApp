'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './EnlaceGestionarEquipo.module.css';

export interface EnlaceGestionarEquipoProps {
  equipoId: string;
}

/** Quien lleva el equipo: edita, invita y arma las listas de buena fe (`10`, 4.3). */
const ROLES_QUE_GESTIONAN = ['captain', 'delegate'];

/**
 * El enlace a `/equipo/[id]/gestionar` en la ficha pública. Esa página
 * está cacheada por evento y es igual para cualquier visitante (D-04b),
 * así que no puede saber si quien la mira tiene vínculo con el equipo:
 * nace oculto y se muestra recién si `GET /api/equipos/mi-rol` confirma,
 * con la sesión real, que hay algún rol activo.
 *
 * **El texto depende del rol**, y eso es lo que corrige el enlace que
 * había. Cualquier integrante puede entrar —capitana, delegada,
 * jugadora o cuerpo técnico—, pero quien no es capitana ni delegada no
 * gestiona nada: lo único que puede hacer ahí es irse del equipo.
 * Ofrecerle "Gestionar equipo" era prometerle una pantalla de gestión y
 * darle, del otro lado, una × al lado de su propio nombre. Reportado en
 * vivo.
 */
export function EnlaceGestionarEquipo({ equipoId }: EnlaceGestionarEquipoProps) {
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/equipos/mi-rol?equipoId=${equipoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        const recibidos = cuerpo?.data?.roles;
        if (!cancelado && Array.isArray(recibidos)) setRoles(recibidos);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [equipoId]);

  if (roles.length === 0) return null;

  const gestiona = roles.some((rol) => ROLES_QUE_GESTIONAN.includes(rol));

  return (
    <Link href={`/equipo/${equipoId}/gestionar`} className={styles.enlace}>
      {gestiona ? 'Gestionar equipo' : 'Dejar equipo'}
    </Link>
  );
}
