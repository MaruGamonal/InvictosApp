'use client';

import Link from 'next/link';
import { useSesion } from '@/components/useSesion';
import styles from './MarcaInvicta.module.css';

/**
 * La campanita, en la fila de la marca y por lo tanto en todas las
 * pantallas. Estaba solo en el encabezado de Inicio: desde cualquier
 * otra pantalla había que volver ahí para ver si había algo.
 *
 * Solo aparece con sesión: a quien todavía no entró no hay nada que
 * notificarle. Igual que `EnlaceIngresar`, se pregunta en el cliente
 * porque las pantallas de descubrimiento se cachean con
 * `CONTEXTO_PUBLICO` (`06`, D-90) y el servidor arma la misma respuesta
 * para cualquiera. La pregunta la comparten los tres componentes que la
 * necesitan (`useSesion`): antes eran tres pedidos idénticos por
 * pantalla.
 */
export interface CampanaNotificacionesProps {
  /**
   * Desde qué modo se toca la campanita. Viaja en la URL para que el
   * centro de notificaciones no devuelva a quien está gestionando una
   * organización al modo jugador sin haberlo pedido.
   */
  modo?: 'jugador' | 'organizador';
}

export function CampanaNotificaciones({ modo }: CampanaNotificacionesProps = {}) {
  const autenticado = useSesion();

  if (!autenticado) return null;

  return (
    <Link
      href={modo === 'organizador' ? '/notificaciones?modo=organizador' : '/notificaciones'}
      className={styles.campana}
      aria-label="Notificaciones"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    </Link>
  );
}
