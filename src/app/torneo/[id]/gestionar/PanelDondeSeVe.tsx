'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import { motivoDelFallo } from '@/components/avisos/motivoDelFallo';
import styles from './pagina.module.css';

export interface PanelDondeSeVeProps {
  torneoId: string;
  estado: string;
  visibilidad: 'public' | 'unlisted';
  organizacionVerificada: boolean;
}

/**
 * Dónde se ve el torneo, y cómo dejar de publicarlo.
 *
 * **Dos cosas distintas, que es el punto.** Publicar era de ida y no
 * había forma de deshacerlo: un torneo de prueba, o publicado por
 * error, se quedaba publicado para siempre, y lo único parecido era
 * cancelarlo — definitivo, y encima lo deja a la vista con el cartel de
 * cancelado.
 *
 * - **Sacarlo de las búsquedas** no le saca nada a nadie: la ficha se
 *   sigue sirviendo completa por link, los equipos inscriptos lo siguen
 *   viendo y el torneo se sigue jugando (`06`, D-21b). Es reversible de
 *   un toque y sirve siempre.
 * - **Volver a borrador** sí lo saca del mundo, y por eso sólo se puede
 *   antes de que se anote nadie. Con equipos adentro el torneo
 *   desaparecería sin explicación desde el lado de ellos; ahí la
 *   respuesta es suspenderlo o cancelarlo, y el servidor lo dice.
 *
 * Volver a las búsquedas exige la organización verificada, la misma
 * regla con la que se decide la visibilidad al publicar (D-51): si no,
 * esto sería la puerta de atrás para saltearse la verificación.
 */
export function PanelDondeSeVe({
  torneoId,
  estado,
  visibilidad,
  organizacionVerificada,
}: PanelDondeSeVeProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState<string | null>(null);

  async function llamar(clave: string, url: string, cuerpo: object, exito: string) {
    if (enviando) return;
    setEnviando(clave);
    const enCurso = avisos.cargando('Guardando…');
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, ...cuerpo }),
      });
      const resultado = await respuesta.json();
      // `fetch` no lanza con 4xx ni 5xx.
      if (!respuesta.ok || !resultado.ok) {
        avisos.error(motivoDelFallo(resultado, 'No pudimos guardar el cambio.'), enCurso);
        setEnviando(null);
        return;
      }
      avisos.exito(exito, enCurso);
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
      setEnviando(null);
    }
  }

  function volverABorrador() {
    if (!window.confirm('¿Volver el torneo a borrador? Deja de estar publicado.')) return;
    llamar('borrador', '/api/torneos/despublicar', {}, 'El torneo volvió a borrador');
  }

  return (
    <div className={styles.formularioChico}>
      <p className={styles.avisoChico}>
        {visibilidad === 'public'
          ? 'Este torneo aparece en las búsquedas.'
          : 'Este torneo no aparece en las búsquedas: se comparte por enlace y funciona completo.'}
      </p>

      <div className={styles.filaAcciones}>
        {visibilidad === 'public' ? (
          <button
            type="button"
            className={styles.botonSecundarioChico}
            onClick={() =>
              llamar(
                'visibilidad',
                '/api/torneos/visibilidad',
                { visibilidad: 'unlisted' },
                'El torneo ya no aparece en las búsquedas',
              )
            }
            disabled={enviando !== null}
          >
            Quitar de las búsquedas
          </button>
        ) : (
          <button
            type="button"
            className={styles.botonSecundarioChico}
            onClick={() =>
              llamar(
                'visibilidad',
                '/api/torneos/visibilidad',
                { visibilidad: 'public' },
                'El torneo vuelve a aparecer en las búsquedas',
              )
            }
            disabled={enviando !== null || !organizacionVerificada}
          >
            Volver a las búsquedas
          </button>
        )}
      </div>

      {visibilidad === 'unlisted' && !organizacionVerificada && (
        <p className={styles.avisoChico}>
          Para que aparezca en las búsquedas, primero verificá tu organización.
        </p>
      )}

      {/* Volver a borrador sólo desde inscripciones abiertas: más
          adelante ya hay fixture o partidos, y eso no sería deshacer la
          publicación sino borrar un torneo que ocurrió. */}
      {estado === 'registration_open' && (
        <>
          <button
            type="button"
            className={styles.botonPeligroChico}
            onClick={volverABorrador}
            disabled={enviando !== null}
          >
            {enviando === 'borrador' ? 'Volviendo…' : 'Volver a borrador'}
          </button>
          <p className={styles.avisoChico}>
            Deja de estar publicado y vuelve a ser editable como antes de publicarlo. Sólo mientras
            no haya ningún equipo anotado.
          </p>
        </>
      )}
    </div>
  );
}
