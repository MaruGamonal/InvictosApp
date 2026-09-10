'use client';

import { useEffect, useState } from 'react';
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
 *
 * La ficha es pública y cacheada por evento (D-04b): nace visible para
 * cualquiera, con la sesión real recién se sabe si quien mira ya tiene
 * algún vínculo con el equipo — reportado en vivo: quien ya es parte
 * del plantel (jugadora, delegada, capitana) seguía viendo el botón.
 * Se consulta `GET /api/equipos/mi-rol` al montarse y, si ya hay algún
 * rol, el botón desaparece — `solicitarIngreso` igual lo rechazaría,
 * pero no hace falta ofrecerlo para que lo descubra recién al tocarlo.
 */
type Estado =
  | { paso: 'inicial' }
  | { paso: 'enviando' }
  | { paso: 'enviado' }
  | { paso: 'ya-soy-miembro' }
  | { paso: 'error'; mensaje: string };

export function BotonPedirSumarme({ equipoId }: BotonPedirSumarmeProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ paso: 'inicial' });

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/equipos/mi-rol?equipoId=${equipoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (!cancelado && (cuerpo?.data?.roles?.length ?? 0) > 0) {
          setEstado({ paso: 'ya-soy-miembro' });
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [equipoId]);

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

  if (estado.paso === 'ya-soy-miembro') return null;

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
