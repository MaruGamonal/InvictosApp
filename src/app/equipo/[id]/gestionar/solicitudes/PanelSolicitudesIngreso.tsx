'use client';

import { useState } from 'react';
import type { SolicitudPendiente } from '@/services/equipos/obtenerGestionEquipo';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  solicitudes: SolicitudPendiente[];
}

type Resultado = 'active' | 'declined';

/**
 * UC-53 — Aceptar o rechazar cada solicitud. A diferencia del patrón
 * anterior (que hacía `router.refresh()` y la fila desaparecía al
 * toque), acá la fila resuelta se queda mostrando el resultado — no hay
 * historial persistido de solicitudes resueltas, así que esto es lo más
 * cerca que se puede mostrar de una confirmación sin inventar un dato
 * que la base no guarda.
 */
export function PanelSolicitudesIngreso({ equipoId, solicitudes }: Props) {
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [resueltas, setResueltas] = useState<Record<string, Resultado>>({});
  const avisos = useAvisos();

  async function resolver(perfilId: string, aceptar: boolean) {
    setEnviandoId(perfilId);
    const enCurso = avisos.cargando(aceptar ? 'Sumando al plantel…' : 'Rechazando…');
    try {
      const respuesta = await fetch('/api/equipos/resolver-solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, perfilId, aceptar }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        avisos.error(cuerpo?.error?.mensaje ?? 'No se pudo resolver la solicitud.', enCurso);
        setEnviandoId(null);
        return;
      }
      setResueltas((actuales) => ({ ...actuales, [perfilId]: aceptar ? 'active' : 'declined' }));
      avisos.exito(aceptar ? 'Sumado al plantel' : 'Solicitud rechazada', enCurso);
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviandoId(null);
    }
  }

  return (
    <div className={styles.lista}>
      {solicitudes.map((solicitud) => {
        const resultado = resueltas[solicitud.perfilId];
        return (
          <div key={solicitud.perfilId} className={styles.filaSolicitud}>
            <span className={styles.nombreSolicitud}>{solicitud.nombreVisible}</span>
            <span className={styles.pideSer}>pide ser Jugador</span>

            {resultado ? (
              <span
                className={
                  resultado === 'active' ? styles.resultadoAceptada : styles.resultadoRechazada
                }
              >
                {resultado === 'active' ? 'Aceptada · ya está en el plantel' : 'Rechazada'}
              </span>
            ) : (
              <div className={styles.filaAccion}>
                <button
                  type="button"
                  disabled={enviandoId === solicitud.perfilId}
                  onClick={() => resolver(solicitud.perfilId, true)}
                >
                  {enviandoId === solicitud.perfilId ? 'Aplicando…' : 'Aceptar'}
                </button>
                <button
                  type="button"
                  className={styles.botonSecundarioChico}
                  disabled={enviandoId === solicitud.perfilId}
                  onClick={() => resolver(solicitud.perfilId, false)}
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
