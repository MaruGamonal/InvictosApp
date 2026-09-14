import type { ReactNode } from 'react';
import styles from './pagina.module.css';

interface Props {
  titulo: string;
  abiertoPorDefecto?: boolean;
  children: ReactNode;
}

/**
 * Acordeón nativo (`<details>`/`<summary>`): sin JS ni estado de
 * cliente, con foco y teclado gratis. Configuración acumula muchas
 * secciones administrativas que casi nunca se tocan todas juntas —
 * mostrarlas siempre desplegadas exige un scroll largo para llegar a
 * la última. Solo "Datos del torneo" arranca abierta; el resto, a un
 * toque de distancia.
 */
export function SeccionAcordeon({ titulo, abiertoPorDefecto = false, children }: Props) {
  return (
    <details className={styles.acordeon} open={abiertoPorDefecto}>
      <summary className={styles.acordeonResumen}>
        {titulo}
        <svg
          className={styles.acordeonIcono}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className={styles.acordeonContenido}>{children}</div>
    </details>
  );
}
