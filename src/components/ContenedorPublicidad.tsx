import type { ReactNode } from 'react';
import styles from './ContenedorPublicidad.module.css';

export interface ContenedorPublicidadProps {
  children?: ReactNode;
}

/**
 * Contenedor propio de la publicidad (`06`, D-75; `08`, 6.4): un borde
 * punteado y un fondo propio que la separan visualmente del contenido
 * del producto — para que un anuncio nunca se confunda con una tarjeta
 * de torneo. El rótulo «Publicidad» va **con** el anuncio, no en lugar
 * del anuncio: es lo que lo declara como tal.
 *
 * **Sin anuncio no hay caja.** Antes el contenedor vacío se mostraba
 * igual, con la palabra «Publicidad» sobre un rectángulo de 90px de
 * alto. A un usuario eso no le dice «acá va a haber un anuncio»: le
 * dice que algo no cargó. Y hoy no hay de dónde sacar anuncios —ni red
 * ni sponsors propios—, así que las tres superficies mostraban ese
 * hueco siempre.
 *
 * Las tres llamadas se dejan puestas y `publicidad.arquitectura.test.ts`
 * las sigue exigiendo: cuando haya anuncios, el único cambio es pasarle
 * el anuncio como `children`. Qué red o qué tabla de sponsors los provee
 * es de T24, que no está construido.
 */
export function ContenedorPublicidad({ children }: ContenedorPublicidadProps) {
  if (!children) return null;

  return (
    <div className={styles.contenedor}>
      <span className={styles.etiqueta}>Publicidad</span>
      {children}
    </div>
  );
}
