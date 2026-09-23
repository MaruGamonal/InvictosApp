'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from './pagina.module.css';

export interface AccionesEstadoTorneoProps {
  torneoId: string;
  estado: string;
  tieneFormatoDefinido: boolean;
  tienePartidos: boolean;
}

type EstadoDestino =
  'registration_open' | 'registration_closed' | 'in_progress' | 'finished' | 'suspended';

/**
 * UC-18/UC-20 — Publicar y avanzar el estado del torneo (`10`, 4.4).
 *
 * El resultado va al avisador y no a un `<p>` acá arriba: este panel
 * vive dentro de un acordeón, y un mensaje que aparece adentro corre
 * hacia abajo todo lo que sigue justo cuando se acaba de tocar el
 * botón. Publicar sin verificar no falla —el torneo nace no listado
 * (`06`, D-51)—, así que eso se avisa como lo que es: una noticia, no
 * un error. Qué hacer al respecto está en el bloque de visibilidad de
 * esta misma pantalla, que no se va solo.
 */
export function AccionesEstadoTorneo({
  torneoId,
  estado,
  tieneFormatoDefinido,
  tienePartidos,
}: AccionesEstadoTorneoProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState<string | null>(null);

  async function publicar() {
    setEnviando('publicar');
    const enCurso = avisos.cargando('Publicando el torneo…');
    try {
      const respuesta = await fetch('/api/torneos/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        avisos.error(cuerpo?.error?.mensaje ?? 'No pudimos publicar el torneo.', enCurso);
        return;
      }
      avisos.exito(
        cuerpo.data?.motivoNoListado === 'organizacion_no_verificada'
          ? 'Torneo publicado. Todavía no aparece en las búsquedas.'
          : 'Torneo publicado.',
        enCurso,
      );
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(null);
    }
  }

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

  return (
    <div className={styles.formularioChico}>
      {estado === 'draft' && (
        <>
          {!tieneFormatoDefinido && (
            <p className={styles.avisoChico}>
              Podés publicar sin definir el formato todavía — solo hace falta antes de generar el
              fixture.
            </p>
          )}
          <div className={styles.filaAcciones}>
            <button type="button" onClick={publicar} disabled={enviando !== null}>
              {enviando === 'publicar' ? 'Publicando…' : 'Publicar torneo'}
            </button>
          </div>
        </>
      )}

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
          {!tienePartidos && (
            <p className={styles.avisoChico}>
              Para iniciar el torneo primero hace falta confirmar el fixture, más abajo.
            </p>
          )}
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

      {estado === 'in_progress' && (
        <div className={styles.filaAcciones}>
          <button type="button" onClick={() => avanzar('finished')} disabled={enviando !== null}>
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
