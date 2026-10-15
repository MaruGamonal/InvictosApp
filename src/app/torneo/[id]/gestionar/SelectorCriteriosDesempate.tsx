'use client';

import type { CriterioDesempate } from '@/services/torneos/obtenerGestionTorneo';
import styles from './pagina.module.css';

export interface SelectorCriteriosDesempateProps {
  valor: CriterioDesempate[];
  alCambiar: (criterios: CriterioDesempate[]) => void;
  deshabilitado?: boolean;
}

const ETIQUETAS: Record<CriterioDesempate, string> = {
  goal_difference: 'Diferencia de gol',
  goals_for: 'Goles a favor',
  head_to_head: 'Lo que hicieron entre ellos',
};

const TODOS: CriterioDesempate[] = ['goal_difference', 'goals_for', 'head_to_head'];

/**
 * El orden de desempate de la tabla.
 *
 * **Por qué importa y por qué faltaba.** `obtenerTabla` aplica estos
 * criterios en este orden para decidir quién termina arriba en un
 * grupo empatado — o sea quién clasifica. Se podían elegir al crear el
 * torneo, desde la API, y después no había forma de verlos ni de
 * cambiarlos: el organizador no sabía con qué regla se estaba
 * resolviendo su propia tabla.
 *
 * **Flechas y no arrastrar.** Reordenar arrastrando en un teléfono es
 * incómodo y con teclado o lector de pantalla directamente no se puede.
 * Subir y bajar es la misma operación, funciona en todos lados, y acá
 * son tres elementos: el costo de "muchos toques" no existe.
 *
 * Los puntos no están en la lista porque no son un criterio de
 * desempate: son el orden mismo, y los criterios empiezan donde los
 * puntos empatan. Decirlo evita la lectura de que se puedan sacar.
 */
export function SelectorCriteriosDesempate({
  valor,
  alCambiar,
  deshabilitado = false,
}: SelectorCriteriosDesempateProps) {
  const sinUsar = TODOS.filter((criterio) => !valor.includes(criterio));

  function mover(desde: number, hacia: number) {
    if (hacia < 0 || hacia >= valor.length) return;
    const siguiente = [...valor];
    const [sacado] = siguiente.splice(desde, 1);
    siguiente.splice(hacia, 0, sacado!);
    alCambiar(siguiente);
  }

  return (
    <div className={styles.listaCriterios}>
      <p className={styles.avisoChico}>
        Primero los puntos. Cuando dos equipos quedan iguales, se resuelve por esto, en este orden.
      </p>

      {valor.map((criterio, indice) => (
        <div key={criterio} className={styles.filaCriterio}>
          <span className={styles.ordenCriterio}>{indice + 1}</span>
          <span className={styles.nombreCriterio}>{ETIQUETAS[criterio]}</span>
          <button
            type="button"
            className={styles.botonCriterio}
            onClick={() => mover(indice, indice - 1)}
            disabled={deshabilitado || indice === 0}
            aria-label={`Subir ${ETIQUETAS[criterio]}`}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.botonCriterio}
            onClick={() => mover(indice, indice + 1)}
            disabled={deshabilitado || indice === valor.length - 1}
            aria-label={`Bajar ${ETIQUETAS[criterio]}`}
          >
            ↓
          </button>
          {/* Sin criterios no hay forma de romper un empate, así que el
              último no se puede sacar. */}
          <button
            type="button"
            className={styles.botonCriterio}
            onClick={() => alCambiar(valor.filter((otro) => otro !== criterio))}
            disabled={deshabilitado || valor.length === 1}
            aria-label={`Quitar ${ETIQUETAS[criterio]}`}
          >
            ×
          </button>
        </div>
      ))}

      {sinUsar.map((criterio) => (
        <div key={criterio} className={styles.filaCriterioInactivo}>
          <span className={styles.nombreCriterio}>{ETIQUETAS[criterio]}</span>
          <button
            type="button"
            className={styles.botonSecundarioChico}
            onClick={() => alCambiar([...valor, criterio])}
            disabled={deshabilitado}
            // "Usarlo" solo no dice qué: para un lector de pantalla los
            // dos botones de esta lista se anunciarían igual.
            aria-label={`Usar ${ETIQUETAS[criterio]}`}
          >
            Usarlo
          </button>
        </div>
      ))}
    </div>
  );
}
