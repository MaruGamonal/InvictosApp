'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BotonSeguir.module.css';

export interface BotonPedirSumarmeProps {
  equipoId: string;
}

/**
 * "Pedir sumarme" (UC-53) al plantel de un equipo — el camino inverso a
 * que te inviten. Pide rol `player` siempre (D-85); el capitán la
 * resuelve desde la gestión del equipo, que no es parte de esta
 * pantalla pública.
 */
type Estado =
  | { paso: 'inicial' }
  | { paso: 'enviando' }
  | { paso: 'enviado' }
  | { paso: 'error'; mensaje: string };

export function BotonPedirSumarme({ equipoId }: BotonPedirSumarmeProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ paso: 'inicial' });

  async function alTocar() {
    if (estado.paso !== 'inicial' && estado.paso !== 'error') return;
    setEstado({ paso: 'enviando' });

    try {
      const respuesta = await fetch('/api/solicitar-ingreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId }),
      });
      const cuerpo = await respuesta.json().catch(() => null);

      if (respuesta.status === 401) {
        router.push('/ingresar');
        return;
      }
      if (!respuesta.ok) {
        setEstado({
          paso: 'error',
          mensaje: cuerpo?.error?.mensaje ?? 'No pudimos enviar el pedido. Probá de nuevo.',
        });
        return;
      }
      setEstado({ paso: 'enviado' });
    } catch {
      setEstado({ paso: 'error', mensaje: 'No pudimos conectar. Probá de nuevo.' });
    }
  }

  return (
    <div className={styles.envoltorio}>
      <button
        type="button"
        onClick={alTocar}
        disabled={estado.paso === 'enviando' || estado.paso === 'enviado'}
        className={styles.botonActivo}
      >
        {estado.paso === 'enviado'
          ? 'Pedido enviado ✓'
          : estado.paso === 'enviando'
            ? 'Enviando…'
            : 'Pedir sumarme'}
      </button>
      {estado.paso === 'error' && <span className={styles.mensajeError}>{estado.mensaje}</span>}
    </div>
  );
}
