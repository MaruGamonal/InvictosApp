'use client';

import { useState } from 'react';
import styles from './AvisoCuentaNoConfirmada.module.css';

export interface AvisoCuentaNoConfirmadaProps {
  mensaje: string;
}

/**
 * Bloqueo de "cuenta no confirmada" (`verificarCuentaConfirmada`,
 * `CUENTA_NO_CONFIRMADA`) — pedido en vivo: en vez de dejar pasar con una
 * advertencia, bloquea del todo y ofrece reenviar el enlace de
 * confirmación (`POST /api/reenviar-confirmacion`).
 */
export function AvisoCuentaNoConfirmada({ mensaje }: AvisoCuentaNoConfirmadaProps) {
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'enviado' | 'error'>('inicial');

  async function reenviar() {
    setEstado('enviando');
    try {
      const respuesta = await fetch('/api/reenviar-confirmacion', { method: 'POST' });
      setEstado(respuesta.ok ? 'enviado' : 'error');
    } catch {
      setEstado('error');
    }
  }

  return (
    <div className={styles.aviso}>
      <p className={styles.mensaje}>{mensaje}</p>
      {estado === 'enviado' ? (
        <p className={styles.confirmacion}>Te reenviamos el enlace — revisá tu correo.</p>
      ) : (
        <button
          type="button"
          className={styles.boton}
          onClick={reenviar}
          disabled={estado === 'enviando'}
        >
          {estado === 'enviando' ? 'Enviando…' : 'Reenviar enlace'}
        </button>
      )}
      {estado === 'error' && <p className={styles.error}>No pudimos reenviarlo. Probá de nuevo.</p>}
    </div>
  );
}
