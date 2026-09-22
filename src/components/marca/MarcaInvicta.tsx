import type { ReactNode } from 'react';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { EnlaceIngresar } from './EnlaceIngresar';
import styles from './MarcaInvicta.module.css';

export interface MarcaInvictaProps {
  /** Lo que va del otro lado de la fila, antes del enlace de ingreso. */
  acciones?: ReactNode;
  /**
   * Las pantallas que solo existen con sesión no tienen a quién
   * ofrecerle "Ingresar": ahí sobra y se apaga.
   */
  conEnlaceIngresar?: boolean;
}

/**
 * La marca, arriba de todo, igual en todas las pantallas.
 *
 * Estaba solo en `/torneos`, escrita a mano dentro de esa página. El
 * resto de las pantallas arrancaba directo con su título, así que la
 * aplicación no se presentaba: pedido en vivo que aparezca en todas.
 *
 * Vive en el hero oscuro, sobre `--ink-900`, así que usa los tokens
 * claros directamente y no los del tema (`08`, 6.1).
 */
export function MarcaInvicta({ acciones, conEnlaceIngresar = true }: MarcaInvictaProps) {
  return (
    <div className={styles.fila}>
      <span className={styles.marca}>
        <span className={styles.punto} aria-hidden />
        {NOMBRE_PRODUCTO}
      </span>
      <span className={styles.acciones}>
        {acciones}
        {conEnlaceIngresar && <EnlaceIngresar />}
      </span>
    </div>
  );
}
