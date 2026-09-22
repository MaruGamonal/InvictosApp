import Link from 'next/link';
import styles from './CambiarDeModo.module.css';

export interface CambiarDeModoProps {
  /** En qué modo está parada la pantalla que lo muestra. */
  modoActual: 'jugador' | 'organizador';
}

/**
 * El cambio entre los dos modos, con un solo componente para los dos
 * lados.
 *
 * Antes eran dos cosas distintas: en Inicio un enlace subrayado que
 * decía "Ver como organizador", y en el panel una flecha de volver sin
 * texto, que además no decía a dónde volvía. Pedido en vivo: que sea el
 * mismo componente y que el texto diga siempre a qué modo se va.
 *
 * `/inicio?volver=1` y no `/inicio` liso: `/inicio` rebota de nuevo al
 * panel cuando la cuenta organiza pero no juega, y sin el parámetro
 * volver era un loop.
 */
export function CambiarDeModo({ modoActual }: CambiarDeModoProps) {
  const vaAlOrganizador = modoActual === 'jugador';

  return (
    <Link
      href={vaAlOrganizador ? '/organizador/gestionar' : '/inicio?volver=1'}
      className={styles.cambiar}
    >
      <svg
        viewBox="0 0 16 16"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        <path d="M2 5.5h9.5L9 3M14 10.5H4.5L7 13" />
      </svg>
      {vaAlOrganizador ? 'Ir al modo organizador' : 'Ir al modo jugador'}
    </Link>
  );
}
