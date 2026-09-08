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
export function BotonPedirSumarme({ equipoId }: BotonPedirSumarmeProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'enviado'>('inicial');

  async function alTocar() {
    if (estado !== 'inicial') return;
    setEstado('enviando');

    try {
      const respuesta = await fetch('/api/solicitar-ingreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId }),
      });

      if (respuesta.status === 401) {
        router.push('/ingresar');
        return;
      }
      if (!respuesta.ok) {
        setEstado('inicial');
        return;
      }
      setEstado('enviado');
    } catch {
      setEstado('inicial');
    }
  }

  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={estado !== 'inicial'}
      className={styles.botonActivo}
    >
      {estado === 'enviado'
        ? 'Pedido enviado ✓'
        : estado === 'enviando'
          ? 'Enviando…'
          : 'Pedir sumarme'}
    </button>
  );
}
