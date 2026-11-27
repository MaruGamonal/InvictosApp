'use client';

import { useState } from 'react';
import { motivoDelFallo } from './avisos/motivoDelFallo';
import styles from './AvisoCuentaNoConfirmada.module.css';

const GENERICO = 'No pudimos reenviarlo. Probá de nuevo.';

export interface AvisoCuentaNoConfirmadaProps {
  mensaje: string;
}

/**
 * Bloqueo de "cuenta no confirmada" (`verificarCuentaConfirmada`,
 * `CUENTA_NO_CONFIRMADA`) — pedido en vivo: en vez de dejar pasar con una
 * advertencia, bloquea del todo y ofrece reenviar el enlace de
 * confirmación (`POST /api/reenviar-confirmacion`).
 *
 * El fallo muestra el motivo que mandó el servidor, no un genérico: el
 * caso más común es el límite de reenvíos, y ahí «Probá de nuevo» al
 * lado de un botón de reintentar manda a repetir justo lo que acaba de
 * ser rechazado por repetirlo. Por eso el botón también desaparece
 * cuando el rechazo vino explicado — vuelve solo si lo que falló fue la
 * conexión o algo de nuestro lado.
 */
export function AvisoCuentaNoConfirmada({ mensaje }: AvisoCuentaNoConfirmadaProps) {
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'enviado' | 'error'>('inicial');
  const [motivo, setMotivo] = useState(GENERICO);
  const [sePuedeReintentar, setSePuedeReintentar] = useState(true);

  async function reenviar() {
    setEstado('enviando');
    try {
      const respuesta = await fetch('/api/reenviar-confirmacion', { method: 'POST' });
      if (respuesta.ok) {
        setEstado('enviado');
        return;
      }
      const cuerpo = await respuesta.json().catch(() => null);
      setMotivo(motivoDelFallo(cuerpo, GENERICO));
      setSePuedeReintentar(respuesta.status >= 500);
      setEstado('error');
    } catch {
      setMotivo('No pudimos conectar. Probá de nuevo.');
      setSePuedeReintentar(true);
      setEstado('error');
    }
  }

  return (
    <div className={styles.aviso}>
      <p className={styles.mensaje}>{mensaje}</p>
      {estado === 'enviado' ? (
        <p className={styles.confirmacion}>Te reenviamos el enlace — revisá tu correo.</p>
      ) : (
        (estado !== 'error' || sePuedeReintentar) && (
          <button
            type="button"
            className={styles.boton}
            onClick={reenviar}
            disabled={estado === 'enviando'}
          >
            {estado === 'enviando' ? 'Enviando…' : 'Reenviar enlace'}
          </button>
        )
      )}
      {/* Un rechazo con explicación ("ya te mandamos uno") no es un error:
          va en el tono del aviso. Rojo sólo si falló la conexión o algo
          nuestro, que es cuando el botón vuelve para reintentar. */}
      {estado === 'error' && (
        <p className={sePuedeReintentar ? styles.error : styles.mensaje}>{motivo}</p>
      )}
    </div>
  );
}
