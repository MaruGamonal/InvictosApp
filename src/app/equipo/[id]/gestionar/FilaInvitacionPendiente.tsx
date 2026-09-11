'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  perfilId: string;
  nombreVisible: string;
  fotoUrl: string | null;
  rol: 'player' | 'delegate' | 'coach';
}

/** Invitación pendiente en el plantel: se ve igual que un integrante activo, con badge INVITADO en vez del rol. */
export function FilaInvitacionPendiente({ equipoId, perfilId, nombreVisible, fotoUrl, rol }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/equipos/cancelar-invitacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, perfilId, rol }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo cancelar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className={styles.filaIntegrante}>
      <div className={styles.filaIntegranteCabecera}>
        <Escudo src={fotoUrl} nombre={nombreVisible} tamano={40} />
        <div className={styles.filaIntegranteInfo}>
          <span className={styles.nombreIntegrante}>{nombreVisible}</span>
          <div className={styles.filaBadgesRol}>
            <Badge campo="integranteEquipo.estadoVinculo" valor="invited" />
          </div>
        </div>
        <button
          type="button"
          className={styles.botonQuitarFila}
          title={`Cancelar la invitación a ${nombreVisible}`}
          onClick={cancelar}
          disabled={enviando}
        >
          ×
        </button>
      </div>
      {error && <p className={styles.errorChico}>{error}</p>}
    </div>
  );
}
