'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BotonSeguir.module.css';

export interface BotonSeguirProps {
  tipoSeguido: 'tournament' | 'team';
  entidadId: string;
}

/**
 * Seguir/dejar de seguir (UC-42/UC-43) — "la acción de conversión de
 * menor compromiso del producto" (`02`, UC-42). No arranca marcado
 * "siguiendo": la ficha es pública y cacheada por evento (T21), la
 * misma para cualquier visitante, así que no puede saber de antemano
 * si quien la mira ya sigue esto — el estado nace acá, al tocar.
 *
 * Sin sesión, `POST /api/seguir` responde `NO_AUTENTICADO` (401): D-04b
 * dice que la acción es visible para cualquiera pero la cuenta se pide
 * recién al usarla, así que ahí es donde manda a `/ingresar`. Todavía
 * no reengancha la acción después del login (`accionesPendientes.ts`
 * ya tiene el mecanismo, pero ningún ejecutor está registrado
 * — queda para cuando se construya ese enganche).
 */
export function BotonSeguir({ tipoSeguido, entidadId }: BotonSeguirProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'siguiendo'>('inicial');

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
        router.push('/ingresar');
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
