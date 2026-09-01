import type { ReactNode } from 'react';
import styles from './ContenedorPublicidad.module.css';

export interface ContenedorPublicidadProps {
  children?: ReactNode;
}

/**
 * Contenedor propio de la publicidad (`06`, D-75; `08`, 6.4): un borde
 * punteado y un fondo propio que la separan visualmente del contenido del
 * producto — para que un anuncio nunca se confunda con una tarjeta de
 * torneo. Este ticket entrega el contenedor vacío; la red de publicidad
 * y qué superficies la muestran es de T24.
 */
export function ContenedorPublicidad({ children }: ContenedorPublicidadProps) {
  return (
    <div className={styles.contenedor}>
      {children ?? <span className={styles.etiqueta}>Publicidad</span>}
    </div>
  );
}
