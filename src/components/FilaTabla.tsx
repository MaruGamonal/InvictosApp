import { Escudo } from './Escudo';
import styles from './FilaTabla.module.css';

export interface FilaTablaProps {
  posicion: number;
  equipo: { nombre: string; escudoUrl?: string | null };
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGol: number;
  puntos: number;
  /**
   * Quita o bonificación de puntos, en columna propia — nunca sumada a
   * `puntos` (`06`, D-35b): así se ve cuánto ganó en la cancha y cuánto
   * le ajustaron, por separado.
   */
  ajustePuntos?: number;
  /**
   * Cuántos de `ganados` son por presentación (`06`, D-33b) — subconjunto
   * de `ganados`, se marca con un asterisco al lado del número.
   */
  ganadosPorPresentacion?: number;
  /** Si esta fila clasifica a la fase siguiente — borde izquierdo de color (Design System, sección 07). */
  clasifica?: boolean;
}

/**
 * Encabezado de la tabla — mismas columnas, fondo oscuro (Design System,
 * sección 07).
 *
 * Cada título es una celda de la grilla, incluido "Equipo". Estaba como
 * texto sólo para lector de pantalla, con `position: absolute`: eso lo
 * sacaba de la grilla y corría todos los títulos una columna — "PJ"
 * quedaba sobre el escudo y "Pts" sobre los ajustes.
 */
export function EncabezadoTabla() {
  return (
    <div className={`${styles.fila} ${styles.encabezado}`} role="row">
      <span className={styles.posicion} role="columnheader">
        #
      </span>
      <span className={styles.equipo} role="columnheader">
        Equipo
      </span>
      <abbr className={styles.numero} title="Partidos jugados" role="columnheader">
        PJ
      </abbr>
      <abbr className={styles.numero} title="Ganados" role="columnheader">
        G
      </abbr>
      <abbr className={styles.numero} title="Empatados" role="columnheader">
        E
      </abbr>
      <abbr className={styles.numero} title="Perdidos" role="columnheader">
        P
      </abbr>
      <abbr className={styles.numero} title="Goles a favor" role="columnheader">
        GF
      </abbr>
      <abbr className={styles.numero} title="Goles en contra" role="columnheader">
        GC
      </abbr>
      <abbr className={styles.numero} title="Diferencia de gol" role="columnheader">
        DG
      </abbr>
      <abbr className={styles.numero} title="Ajuste de puntos" role="columnheader">
        Aj.
      </abbr>
      <abbr className={styles.puntos} title="Puntos" role="columnheader">
        Pts
      </abbr>
    </div>
  );
}

/**
 * Fila de la tabla de posiciones (`08`, 11.4 y 11.10), con cifras
 * tabulares obligatorias para que las columnas numéricas queden
 * alineadas (`08`, sección 7) — el criterio de descarte, no de
 * preferencia.
 *
 * El nombre del equipo se ve siempre: posición y equipo quedan fijos a
 * la izquierda y los puntos fijos a la derecha, y lo que scrollea
 * horizontal son las columnas de detalle del medio. Antes la fila
 * mostraba sólo el escudo, con el nombre en un tooltip; como casi
 * ningún equipo amateur tiene escudo, todas las filas eran el mismo
 * círculo con una inicial y la tabla no decía quién era quién.
 */
export function FilaTabla({
  posicion,
  equipo,
  partidosJugados,
  ganados,
  empatados,
  perdidos,
  golesFavor,
  golesContra,
  diferenciaGol,
  puntos,
  ajustePuntos = 0,
  ganadosPorPresentacion = 0,
  clasifica,
}: FilaTablaProps) {
  return (
    <div className={`${styles.fila} ${clasifica ? styles.clasifica : ''}`} role="row">
      <span className={styles.posicion} role="cell">
        {posicion}
      </span>
      <span className={styles.equipo} role="rowheader">
        <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={22} />
        <span className={styles.nombreEquipo} title={equipo.nombre}>
          {equipo.nombre}
        </span>
      </span>
      <span className={styles.numero} role="cell">
        {partidosJugados}
      </span>
      <span className={styles.numero} role="cell">
        {ganados}
        {ganadosPorPresentacion > 0 && (
          <sup
            className={styles.marcaPresentacion}
            title={
              ganadosPorPresentacion === ganados
                ? 'Todos los triunfos son por presentación'
                : `${ganadosPorPresentacion} de esos triunfos son por presentación`
            }
          >
            *
          </sup>
        )}
      </span>
      <span className={styles.numero} role="cell">
        {empatados}
      </span>
      <span className={styles.numero} role="cell">
        {perdidos}
      </span>
      <span className={styles.numero} role="cell">
        {golesFavor}
      </span>
      <span className={styles.numero} role="cell">
        {golesContra}
      </span>
      <span className={styles.numero} role="cell">
        {diferenciaGol > 0 ? `+${diferenciaGol}` : diferenciaGol}
      </span>
      <span
        className={`${styles.numero} ${ajustePuntos < 0 ? styles.ajusteNegativo : ''}`}
        role="cell"
      >
        {ajustePuntos === 0 ? '—' : ajustePuntos > 0 ? `+${ajustePuntos}` : ajustePuntos}
      </span>
      <span className={styles.puntos} role="cell">
        {puntos}
      </span>
    </div>
  );
}
