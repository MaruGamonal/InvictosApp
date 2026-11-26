'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import { ESTADOS_CON_ACCIONES_DE_ESTADO } from './_estadosDeTorneo';
import styles from './pagina.module.css';

export interface AccionesEstadoTorneoProps {
  torneoId: string;
  estado: string;
  tienePartidos: boolean;
  /**
   * Partidos que todavía se tienen que jugar (sin programar, programados
   * o postergados). Decide si finalizar es la acción sugerida (`06`,
   * D-23b: "con sugerencia del sistema cuando no quedan partidos
   * pendientes") o una que hay que confirmar sabiendo lo que se pierde.
   */
  partidosPendientes?: number;
}

type EstadoDestino =
  'registration_open' | 'registration_closed' | 'in_progress' | 'finished' | 'suspended';

/**
 * UC-20 — Avanzar el estado de un torneo **ya publicado** (`10`, 4.4).
 *
 * Publicar ya no está acá. Vivía dentro de este acordeón, a tres toques
 * de distancia y en una versión pobre —publicaba y tiraba un aviso, sin
 * explicar la visibilidad que le quedaba al torneo ni ofrecer verificar
 * la organización ni decir qué datos faltaban—, mientras el último paso
 * del alta tenía la versión buena. Ahora hay una sola, en el Resumen
 * (`PanelPublicarTorneo`): publicar no es un ajuste del torneo, es la
 * decisión que lo pone en el mundo.
 *
 * El resultado va al avisador y no a un `<p>` acá arriba: este panel
 * vive dentro de un acordeón, y un mensaje que aparece adentro corre
 * hacia abajo todo lo que sigue justo cuando se acaba de tocar el
 * botón.
 */
export function AccionesEstadoTorneo({
  torneoId,
  estado,
  tienePartidos,
  partidosPendientes = 0,
}: AccionesEstadoTorneoProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [confirmandoFinal, setConfirmandoFinal] = useState(false);

  async function avanzar(estadoDestino: EstadoDestino) {
    setEnviando(estadoDestino);
    const enCurso = avisos.cargando('Cambiando el estado…');
    try {
      const respuesta = await fetch('/api/torneos/avanzar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, estadoDestino }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        avisos.error(cuerpo?.error?.mensaje ?? 'No pudimos cambiar el estado.', enCurso);
        return;
      }
      avisos.exito('Estado actualizado.', enCurso);
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(null);
    }
  }

  if (!ESTADOS_CON_ACCIONES_DE_ESTADO.has(estado)) return null;

  return (
    <div className={styles.formularioChico}>
      {estado === 'registration_open' && (
        <div className={styles.filaAcciones}>
          <button
            type="button"
            onClick={() => avanzar('registration_closed')}
            disabled={enviando !== null}
          >
            Cerrar inscripciones
          </button>
          <button
            type="button"
            className={styles.botonSecundarioChico}
            onClick={() => avanzar('suspended')}
            disabled={enviando !== null}
          >
            Suspender
          </button>
        </div>
      )}

      {estado === 'registration_closed' && (
        <>
          {!tienePartidos && <p className={styles.avisoChico}>Falta confirmar el fixture.</p>}
          <div className={styles.filaAcciones}>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => avanzar('registration_open')}
              disabled={enviando !== null}
            >
              Reabrir inscripciones
            </button>
            <button
              type="button"
              onClick={() => avanzar('in_progress')}
              disabled={enviando !== null || !tienePartidos}
            >
              Iniciar torneo
            </button>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => avanzar('suspended')}
              disabled={enviando !== null}
            >
              Suspender
            </button>
          </div>
        </>
      )}

      {/*
        Finalizar no tiene vuelta atrás: `finished` no transiciona a
        nada, y un torneo finalizado ya no acepta resultados. Era el
        botón principal de la pantalla y se ejecutaba con un toque,
        también con partidos sin jugar. Ahora es la acción sugerida sólo
        cuando no queda ninguno (`06`, D-23b) y siempre pide
        confirmación diciendo la consecuencia real (`08`, 8).
      */}
      {estado === 'in_progress' && !confirmandoFinal && (
        <>
          {partidosPendientes === 0 && tienePartidos && (
            <p className={styles.avisoChico}>
              Ya se jugaron todos los partidos: podés finalizar el torneo.
            </p>
          )}
          <div className={styles.filaAcciones}>
            <button
              type="button"
              className={partidosPendientes > 0 ? styles.botonSecundarioChico : undefined}
              onClick={() => setConfirmandoFinal(true)}
              disabled={enviando !== null}
            >
              Finalizar torneo
            </button>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => avanzar('suspended')}
              disabled={enviando !== null}
            >
              Suspender
            </button>
          </div>
        </>
      )}

      {estado === 'in_progress' && confirmandoFinal && (
        <>
          <p className={styles.avisoChico}>
            {partidosPendientes > 0
              ? `Quedan ${partidosPendientes} ${partidosPendientes === 1 ? 'partido' : 'partidos'} sin jugar. `
              : ''}
            Al finalizar, la tabla queda como está y ya no se pueden cargar resultados. No se puede
            deshacer. Los equipos reciben el aviso.
          </p>
          <div className={styles.filaAcciones}>
            <button
              type="button"
              className={partidosPendientes > 0 ? styles.botonPeligro : undefined}
              onClick={() => avanzar('finished')}
              disabled={enviando !== null}
            >
              Sí, finalizar
            </button>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => setConfirmandoFinal(false)}
              disabled={enviando !== null}
            >
              Volver
            </button>
          </div>
        </>
      )}

      {estado === 'suspended' && (
        <>
          <p className={styles.avisoChico}>Elegí en qué punto retoma el torneo.</p>
          <div className={styles.filaAcciones}>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => avanzar('registration_open')}
              disabled={enviando !== null}
            >
              Abrir inscripciones
            </button>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => avanzar('registration_closed')}
              disabled={enviando !== null}
            >
              Cerrar inscripciones
            </button>
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => avanzar('in_progress')}
              disabled={enviando !== null || !tienePartidos}
            >
              Iniciar torneo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
