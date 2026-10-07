'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';

/**
 * Dejar el equipo, en un solo lugar.
 *
 * La acción aparece en dos presentaciones distintas —la × en la fila de
 * uno mismo, para quien está gestionando el plantel, y el botón suelto
 * de la pantalla de quien solo es integrante— pero es la misma llamada,
 * el mismo texto de confirmación y el mismo desenlace. Separadas se
 * iban a desincronizar solas.
 *
 * El aviso de éxito sobrevive a la navegación porque el proveedor vive
 * en el layout raíz: se lee ya en la ficha del equipo.
 */
export function useDejarEquipo(equipoId: string, perfilId: string) {
  const router = useRouter();
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState(false);

  async function dejarEquipo() {
    if (enviando) return;
    if (!window.confirm('¿Dejar el equipo? Vas a perder tu lugar en el plantel.')) return;
    setEnviando(true);
    const enCurso = avisos.cargando('Saliendo del equipo…');

    try {
      const respuesta = await fetch('/api/equipos/quitar-integrante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, perfilId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        avisos.error(cuerpo?.error?.mensaje ?? 'No pudimos dejar el equipo.', enCurso);
        setEnviando(false);
        return;
      }
      avisos.exito('Dejaste el equipo', enCurso);
      router.push(`/equipo/${equipoId}`);
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
      setEnviando(false);
    }
  }

  return { dejarEquipo, enviando };
}
