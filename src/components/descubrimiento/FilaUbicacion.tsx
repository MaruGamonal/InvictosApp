import type { ReactNode } from 'react';
import styles from './FilaUbicacion.module.css';

export interface FilaUbicacionProps {
  /** Nombre de la ciudad elegida, o `null` si todavía no hay ninguna. */
  ciudad: string | null;
  /** El selector de ciudad, que cada pantalla arma con su propia acción. */
  children: ReactNode;
}

/**
 * La ciudad del descubrimiento, igual en `/torneos` y en `/equipos`.
 *
 * Es un `<details>`: cerrado muestra «▸ Posadas», abierto despliega el
 * selector. Sin JavaScript sigue funcionando.
 *
 * El triángulo es un SVG propio y no el marcador nativo del `summary`,
 * porque en cuanto la fila es `display: flex` —y tiene que serlo, para
 * centrar el texto en los 44px de alto— varios navegadores dejan de
 * dibujarlo.
 *
 * El componente solo pone la fila; el selector llega por `children`
 * porque cada pantalla lo conecta a su propia Server Action, para volver
 * a la pantalla donde estabas y no siempre a la misma.
 */
export function FilaUbicacion({ ciudad, children }: FilaUbicacionProps) {
  return (
    <details className={styles.ubicacion}>
      <summary className={styles.resumen}>
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
        {ciudad ?? 'Elegí tu ciudad'}
      </summary>
      <div className={styles.panel}>{children}</div>
    </details>
  );
}
