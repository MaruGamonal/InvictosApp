import styles from './EstadoVacio.module.css';

export interface EstadoVacioProps {
  mensaje: string;
  textoAccion?: string;
  onAccion?: () => void;
}

/**
 * Estado vacío (`08`, 11.10): siempre copy explicativo + una acción
 * sugerida — nunca una lista vacía sin contexto (`05`, sección 5). Es el
 * patrón que más se repite del producto: descubrimiento, estadísticas,
 * actividad, score.
 */
export function EstadoVacio({ mensaje, textoAccion, onAccion }: EstadoVacioProps) {
  return (
    <div className={styles.estadoVacio}>
      <p className={styles.mensaje}>{mensaje}</p>
      {textoAccion && (
        <button type="button" className={styles.accion} onClick={onAccion}>
          {textoAccion}
        </button>
      )}
    </div>
  );
}
