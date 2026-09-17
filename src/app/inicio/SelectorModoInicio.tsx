'use client';

import Link from 'next/link';
import type { ModoInicio } from '@/lib/modoInicio';
import styles from './pagina.module.css';

interface Props {
  modoActual: ModoInicio;
}

const ETIQUETA_DESTINO: Record<ModoInicio, string> = {
  jugador: 'Ver como administrador',
  organizador: 'Ver como jugador',
};

/**
 * Enlace discreto para quien tiene los dos roles (Jugador y
 * Organizador): Inicio siempre arranca en modo Jugador, esto ofrece
 * pasar a Organizador sin la prominencia de un switch de dos pestañas.
 * Guarda la elección (`POST /api/inicio/modo`) para que la próxima
 * visita entre directo en ese modo — la navegación al modo elegido no
 * espera esa respuesta, nunca la bloquea.
 */
export function SelectorModoInicio({ modoActual }: Props) {
  const modoDestino: ModoInicio = modoActual === 'jugador' ? 'organizador' : 'jugador';

  function guardarPreferencia() {
    fetch('/api/inicio/modo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo: modoDestino }),
    }).catch(() => {
      // La navegación ya va a ?modo=; si esto falla, la próxima visita
      // simplemente vuelve a arrancar en el modo por defecto.
    });
  }

  return (
    <Link
      href={`/inicio?modo=${modoDestino}`}
      className={styles.selectorModo}
      onClick={guardarPreferencia}
    >
      {ETIQUETA_DESTINO[modoActual]}
    </Link>
  );
}
