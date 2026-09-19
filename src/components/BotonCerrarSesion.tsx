'use client';

import { useState } from 'react';
import styles from './BotonCerrarSesion.module.css';

export interface BotonCerrarSesionProps {
  /**
   * `card` (default): botón de error autocontenido, para una superficie
   * clara como `/perfil`. `discreto`: link chico sobre fondo oscuro,
   * para un header como el del panel de Organizador.
   */
  variante?: 'card' | 'discreto';
}

/**
 * Reportado en vivo: desde el panel de Organizador no había forma de
 * cerrar sesión — la única salida vivía en `/perfil` (Jugador), fuera
 * del todo del nav propio de Organizador. Se comparte acá en vez de
 * quedar local a `/perfil` para que ambos headers lo usen sin duplicar
 * el fetch a `/api/cerrar-sesion`.
 */
export function BotonCerrarSesion({ variante = 'card' }: BotonCerrarSesionProps) {
  const [enviando, setEnviando] = useState(false);

  async function cerrarSesion() {
    setEnviando(true);
    try {
      await fetch('/api/cerrar-sesion', { method: 'POST' });
    } catch {
      // Sin conexión o lo que sea — igual se manda a / para no dejar a
      // nadie atrapado esperando un click que no hace nada.
    } finally {
      window.location.assign('/');
    }
  }

  return (
    <button
      type="button"
      className={variante === 'discreto' ? styles.botonDiscreto : styles.boton}
      onClick={cerrarSesion}
      disabled={enviando}
    >
      {enviando ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
