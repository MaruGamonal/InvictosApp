import { Escudo } from './Escudo';
import styles from './FilaTabla.module.css';

export interface FilaTablaProps {
  posicion: number;
  equipo: { nombre: string; escudoUrl?: string | null };
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
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

/** Encabezado de la tabla — mismas columnas, fondo oscuro (Design System, sección 07). */
export function EncabezadoTabla() {
  return (
    <div className={`${styles.fila} ${styles.encabezado}`}>
      <span>#</span>
      <span className={styles.srOnly}>Equipo</span>
      <span className={styles.numero}>PJ</span>
      <span className={styles.numero}>G</span>
      <span className={styles.numero}>E</span>
      <span className={styles.numero}>P</span>
      <span className={styles.numero}>DG</span>
      <span className={styles.numero}>Aj.</span>
      <span className={styles.puntos}>Pts</span>
    </div>
  );
}

/**
 * Fila de la tabla de posiciones (`08`, 11.10), con cifras tabulares
 * obligatorias para que las columnas numéricas queden alineadas
 * (`08`, sección 7) — el criterio de descarte, no de preferencia.
 */
export function FilaTabla({
  posicion,
  equipo,
  partidosJugados,
  ganados,
  empatados,
  perdidos,
  diferenciaGol,
  puntos,
  ajustePuntos = 0,
  ganadosPorPresentacion = 0,
  clasifica,
}: FilaTablaProps) {
  return (
    <div className={`${styles.fila} ${clasifica ? styles.clasifica : ''}`}>
      <span className={styles.posicion}>{posicion}</span>
      <span className={styles.equipo}>
        <button type="button" className={styles.botonEquipo}>
          <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={22} />
          <span className={styles.tooltipNombre} aria-hidden="true">
            {equipo.nombre}
          </span>
        </button>
      </span>
      <span className={styles.numero}>{partidosJugados}</span>
      <span className={styles.numero}>
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
      <span className={styles.numero}>{empatados}</span>
      <span className={styles.numero}>{perdidos}</span>
      <span className={styles.numero}>
        {diferenciaGol > 0 ? `+${diferenciaGol}` : diferenciaGol}
      </span>
      <span className={`${styles.numero} ${ajustePuntos < 0 ? styles.ajusteNegativo : ''}`}>
        {ajustePuntos === 0 ? '—' : ajustePuntos > 0 ? `+${ajustePuntos}` : ajustePuntos}
      </span>
      <span className={styles.puntos}>{puntos}</span>
    </div>
  );
}
