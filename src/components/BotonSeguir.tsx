'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BotonSeguir.module.css';

export interface BotonSeguirProps {
  tipoSeguido: 'tournament' | 'team';
  entidadId: string;
}

/**
 * Seguir/dejar de seguir (UC-42/UC-43) — "la acción de conversión de
 * menor compromiso del producto" (`02`, UC-42). La ficha es pública y
 * cacheada por evento (T21), la misma para cualquier visitante, así
 * que el HTML no puede nacer marcado "siguiendo" — pero apenas se
 * monta en el cliente, con la sesión real, pregunta a
 * `GET /api/seguir` si la persona que mira ya lo sigue y se corrige
 * sola. Sin esto, volver a una ficha que ya seguías mostraba "Seguir"
 * de nuevo — reportado en vivo.
 *
 * Sin sesión, `POST /api/seguir` responde `NO_AUTENTICADO` (401): D-04b
 * dice que la acción es visible para cualquiera pero la cuenta se pide
 * recién al usarla, así que ahí es donde manda a `/ingresar` — con el
 * torneo/equipo codificado en la URL, para que `/ingresar` reenganche
 * la acción al terminar (registrarse la sigue al toque vía
 * `accionesPendientes.ts`/`registrarEjecutorSeguir.ts`; ingresar la
 * repite del lado del cliente, ya con sesión) sin volver a tocar
 * "Seguir".
 */
export function BotonSeguir({ tipoSeguido, entidadId }: BotonSeguirProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'siguiendo'>('inicial');

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/seguir?tipoSeguido=${tipoSeguido}&entidadId=${entidadId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (!cancelado && cuerpo?.data?.siguiendo) setEstado('siguiendo');
      })
      .catch(() => {
        // Si falla el chequeo, se queda en "inicial" — nunca peor que antes.
      });
    return () => {
      cancelado = true;
    };
  }, [tipoSeguido, entidadId]);

  async function alTocar() {
    if (estado === 'enviando') return;
    const siguiendo = estado === 'siguiendo';
    setEstado('enviando');

    try {
      const respuesta = await fetch(siguiendo ? '/api/dejar-de-seguir' : '/api/seguir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoSeguido, entidadId }),
      });

      if (respuesta.status === 401) {
        router.push(
          `/ingresar?accion=seguir&tipoSeguido=${tipoSeguido}&entidadId=${entidadId}`,
        );
        return;
      }
      if (!respuesta.ok) {
        setEstado(siguiendo ? 'siguiendo' : 'inicial');
        return;
      }
      setEstado(siguiendo ? 'inicial' : 'siguiendo');
    } catch {
      setEstado(siguiendo ? 'siguiendo' : 'inicial');
    }
  }

  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={estado === 'enviando'}
      className={estado === 'siguiendo' ? styles.botonActivo : styles.boton}
    >
      {estado === 'siguiendo' ? 'Siguiendo ✓' : 'Seguir'}
    </button>
  );
}
