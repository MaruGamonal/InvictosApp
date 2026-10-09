import type { ReactNode } from 'react';
import styles from './BarraAccionFija.module.css';

export interface BarraAccionFijaProps {
  children: ReactNode;
}

/**
 * La acción principal de la pantalla, fija abajo.
 *
 * **Para qué.** En un teléfono, la acción que hay que tocar no tiene por
 * qué estar al final de un scroll: en el Resumen de un borrador, arriba
 * del botón hay una explicación, el aviso de verificación y —si falta
 * algo— la lista de datos pendientes. Con la barra, publicar está
 * siempre a un toque, se haya leído todo eso o no.
 *
 * **La pantalla tiene que hacerle lugar.** Una barra `fixed` tapa lo
 * que haya debajo al llegar al fondo, y lo tapado es justo lo último.
 * El hueco no lo puede poner este componente: donde se lo monta suele
 * ser el medio de una tarjeta, y el espacio hace falta al final de la
 * pantalla. Por eso el contenedor de la pantalla lleva la clase
 * `conBarraFija` de este mismo módulo — así el alto sale de un solo
 * lugar y no de dos números que se separan.
 *
 * No va en la ficha pública ni en ninguna pantalla con `NavInferior`:
 * las dos son barras fijas abajo y se taparían entre sí.
 */
export function BarraAccionFija({ children }: BarraAccionFijaProps) {
  return (
    <div className={styles.barra}>
      <div className={styles.contenido}>{children}</div>
    </div>
  );
}
