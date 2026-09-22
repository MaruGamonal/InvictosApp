import type { ReactNode } from 'react';
import styles from './BarraDescubrimiento.module.css';

export interface BarraDescubrimientoProps {
  /** Ciudad elegida, o `null` si todavía no hay ninguna. */
  ciudad: string | null;
  /** Selector de ciudad; cada pantalla lo arma con su propia acción. */
  selectorDeCiudad: ReactNode;
  /** Controles de filtrado de esta pantalla. */
  filtros: ReactNode;
  /** Cuántos filtros hay puestos, para decirlo sin abrir el panel. */
  filtrosActivos: number;
}

/**
 * La barra de control del descubrimiento: una sola fila, la misma en
 * `/torneos` y en `/equipos`.
 *
 * Reportado en vivo dos veces: los filtros se comían el alto antes del
 * primer resultado. Primero fueron chips de una fila, después
 * desplegables; en las dos formas seguían siendo tres franjas de 44px
 * —ubicación, chips, desplegables— y encima Torneos tenía una más que
 * Equipos, así que ni siquiera eran iguales.
 *
 * Acá las dos pantallas tienen exactamente la misma fila de 44px:
 * la ciudad a la izquierda, los filtros a la derecha. Lo que cambia es
 * qué hay dentro del panel de filtros, no la barra.
 *
 * Los dos paneles se abren **por encima** del contenido, no empujándolo:
 * mismo criterio que los avisos. Abrir la ciudad ya no corre los
 * resultados media pantalla para abajo.
 *
 * Son dos `<details>`, así que sin JavaScript se abren igual. El
 * contador de filtros puestos va en el propio texto —«Filtros · 2»— y
 * no como un color, que sería lo único que los distinguiría.
 */
export function BarraDescubrimiento({
  ciudad,
  selectorDeCiudad,
  filtros,
  filtrosActivos,
}: BarraDescubrimientoProps) {
  return (
    <div className={styles.barra}>
      <details className={styles.desplegable}>
        <summary className={styles.resumen}>
          <Flecha />
          <span className={styles.textoResumen}>{ciudad ?? 'Elegí tu ciudad'}</span>
        </summary>
        <div className={styles.panel}>{selectorDeCiudad}</div>
      </details>

      <details className={styles.desplegable}>
        <summary className={`${styles.resumen} ${styles.resumenFiltros}`}>
          <Embudo />
          <span className={styles.textoResumen}>
            {filtrosActivos > 0 ? `Filtros · ${filtrosActivos}` : 'Filtros'}
          </span>
        </summary>
        <div className={styles.panel}>{filtros}</div>
      </details>
    </div>
  );
}

/**
 * El triángulo del `summary` lo dibujamos nosotros: en cuanto la fila es
 * `display: flex` —y tiene que serlo, para centrar el texto en los 44px
 * de alto— varios navegadores dejan de pintar el marcador nativo.
 */
function Flecha() {
  return (
    <svg
      className={styles.flecha}
      viewBox="0 0 12 12"
      width="10"
      height="10"
      aria-hidden
      focusable="false"
    >
      <path
        d="M4 2.5 8 6l-4 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Embudo() {
  return (
    <svg
      className={styles.embudo}
      viewBox="0 0 14 14"
      width="13"
      height="13"
      aria-hidden
      focusable="false"
    >
      <path
        d="M1.5 2.5h11L8.2 7.4v4.1L5.8 12.5V7.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
