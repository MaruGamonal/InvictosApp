'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import type { IntegranteEquipoPublico } from '@/services/equipos/obtenerEquipoPublico';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  integrantes: IntegranteEquipoPublico[];
  mostrarRoles: boolean;
}

/**
 * Fila de plantel/cuerpo técnico de la ficha pública — esa página está
 * cacheada por evento y es igual para cualquier visitante (D-04b), así
 * que no puede saber de entrada cuál fila es "vos". Nace sin marcar y
 * se corrige recién con `GET /api/equipos/mi-rol`, con la sesión real
 * (mismo mecanismo que `EnlaceGestionarEquipo`).
 */
export function ListaPlantelPublico({ equipoId, integrantes, mostrarRoles }: Props) {
  const [miPerfilId, setMiPerfilId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/equipos/mi-rol?equipoId=${equipoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (!cancelado && cuerpo?.data?.perfilId) setMiPerfilId(cuerpo.data.perfilId);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [equipoId]);

  return (
    <ul className={styles.listaIntegrantes}>
      {integrantes.map((integrante) => (
        <li key={integrante.perfilId} className={styles.integrante}>
          <Link href={`/jugador/${integrante.perfilId}`} className={styles.enlaceIntegrante}>
            <Escudo src={integrante.fotoUrl} nombre={integrante.nombreVisible} tamano={36} />
            <span>
              {integrante.nombreVisible}
              {integrante.perfilId === miPerfilId && ' (vos)'}
            </span>
          </Link>
          {mostrarRoles && (
            <div className={styles.filaBadgesRolPublico}>
              {integrante.rolesEquipo
                .filter((rol) => rol !== 'coach')
                .map((rol) => (
                  <Badge key={rol} campo="integranteEquipo.rolEquipo" valor={rol} />
                ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
