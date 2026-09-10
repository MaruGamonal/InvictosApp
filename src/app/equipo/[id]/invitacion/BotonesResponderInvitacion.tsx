'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
}

/** UC-12 — cliente de `POST /api/equipos/responder-invitacion`. */
export function BotonesResponderInvitacion({ equipoId }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<'aceptar' | 'rechazar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function responder(aceptar: boolean) {
    if (enviando) return;
    if (!aceptar && !window.confirm('¿Rechazar la invitación? No queda a la vista de nadie.')) {
      return;
    }
    setEnviando(aceptar ? 'aceptar' : 'rechazar');
    setError(null);

    try {
      const respuesta = await fetch('/api/equipos/responder-invitacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, aceptar }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo responder. Probá de nuevo.');
        setEnviando(null);
        return;
      }
      router.push(aceptar ? `/equipo/${equipoId}` : '/inicio');
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(null);
    }
  }

  return (
    <div className={styles.botones}>
      {error && <p className={styles.errorChico}>{error}</p>}
      <button
        type="button"
        className={styles.botonPrincipal}
        onClick={() => responder(true)}
        disabled={enviando !== null}
      >
        {enviando === 'aceptar' ? 'Aceptando…' : 'Aceptar'}
      </button>
      <button
        type="button"
        className={styles.botonSecundario}
        onClick={() => responder(false)}
        disabled={enviando !== null}
      >
        {enviando === 'rechazar' ? 'Rechazando…' : 'Rechazar'}
      </button>
    </div>
  );
}
