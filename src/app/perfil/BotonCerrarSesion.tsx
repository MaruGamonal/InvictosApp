'use client';

import { useState } from 'react';
import styles from './pagina.module.css';

export function BotonCerrarSesion() {
  const [enviando, setEnviando] = useState(false);

  async function cerrarSesion() {
    setEnviando(true);
    try {
      await fetch('/api/cerrar-sesion', { method: 'POST' });
    } finally {
      window.location.assign('/');
    }
  }

  return (
    <button type="button" className={styles.botonCerrarSesion} onClick={cerrarSesion} disabled={enviando}>
      {enviando ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
