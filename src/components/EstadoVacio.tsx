import Link from 'next/link';
import styles from './EstadoVacio.module.css';

export interface EstadoVacioProps {
  mensaje: string;
  textoAccion?: string;
  onAccion?: () => void;
  /** Alternativa a `onAccion` para páginas de servidor: renderiza la acción como link en vez de botón. */
  hrefAccion?: string;
}

/**
 * Estado vacío (`08`, 11.10): copy explicativo y, cuando hay un paso
 * siguiente real, una acción sugerida — nunca una lista vacía que
 * sugiera que el producto entero está roto (`05`, sección 5). No todo
 * estado vacío tiene una acción con sentido (p. ej. "no tenés
 * notificaciones"): forzar un botón ahí sería peor que no tener
 * ninguno, así que `textoAccion`/`onAccion`/`hrefAccion` son opcionales.
 */
export function EstadoVacio({ mensaje, textoAccion, onAccion, hrefAccion }: EstadoVacioProps) {
  return (
    <div className={styles.estadoVacio}>
      <p className={styles.mensaje}>{mensaje}</p>
      {textoAccion && hrefAccion && (
        <Link href={hrefAccion} className={styles.accion}>
          {textoAccion}
        </Link>
      )}
      {textoAccion && !hrefAccion && (
        <button type="button" className={styles.accion} onClick={onAccion}>
          {textoAccion}
        </button>
      )}
    </div>
  );
}
