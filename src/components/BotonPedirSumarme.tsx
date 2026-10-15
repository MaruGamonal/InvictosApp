'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from './avisos/Avisos';
import styles from './BotonSeguir.module.css';

export interface BotonPedirSumarmeProps {
  equipoId: string;
  /**
   * Un equipo archivado ya no recibe pedidos para sumarse. El botón
   * queda a la vista pero sin acción: esconderlo dejaría la pantalla sin
   * explicar por qué no se puede.
   */
  deshabilitado?: boolean;
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
 *
 * **Y si hay una solicitud pendiente, ofrece retirarla.** El pedido
 * sobrevivía a la recarga pero la pantalla no: volvía a mostrar "Pedir
 * sumarme" como si no se hubiera pedido nada, y no había forma de
 * echarse atrás. `retirarSolicitudIngreso` existía desde T19, con su
 * ruta, y no lo llamaba ninguna pantalla.
 */
type Estado =
  | { paso: 'inicial' }
  | { paso: 'enviando' }
  | { paso: 'enviado' }
  | { paso: 'retirando' }
  | { paso: 'ya-soy-miembro' }
  | { paso: 'error'; mensaje: string };

export function BotonPedirSumarme({ equipoId, deshabilitado = false }: BotonPedirSumarmeProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [estado, setEstado] = useState<Estado>({ paso: 'inicial' });

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/equipos/mi-rol?equipoId=${equipoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (cancelado) return;
        if ((cuerpo?.data?.roles?.length ?? 0) > 0) {
          setEstado({ paso: 'ya-soy-miembro' });
        } else if (cuerpo?.data?.solicitudPendiente) {
          setEstado({ paso: 'enviado' });
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
        if (cuerpo?.error?.codigo === 'CUENTA_NO_CONFIRMADA') {
          // Por aviso y no reemplazando el botón: la ficha del equipo
          // queda exactamente como estaba, con «Pedir sumarme» a la
          // vista para volver a intentarlo después de confirmar.
          setEstado({ paso: 'inicial' });
          avisos.cuentaNoConfirmada();
          return;
        }
        setEstado({
          paso: 'error',
          mensaje: cuerpo?.error?.mensaje ?? 'No pudimos enviar la solicitud. Probá de nuevo.',
        });
        return;
      }
      setEstado({ paso: 'enviado' });
    } catch {
      setEstado({ paso: 'error', mensaje: 'No pudimos conectar. Probá de nuevo.' });
    }
  }

  async function retirar() {
    if (estado.paso !== 'enviado') return;
    setEstado({ paso: 'retirando' });
    try {
      const respuesta = await fetch('/api/equipos/retirar-solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setEstado({
          paso: 'error',
          mensaje: cuerpo?.error?.mensaje ?? 'No pudimos retirar la solicitud. Probá de nuevo.',
        });
        return;
      }
      // Vuelve al principio: se puede pedir de nuevo.
      setEstado({ paso: 'inicial' });
      router.refresh();
    } catch {
      setEstado({ paso: 'error', mensaje: 'No pudimos conectar. Probá de nuevo.' });
    }
  }

  if (estado.paso === 'ya-soy-miembro') return null;

  const esperando = estado.paso === 'enviado' || estado.paso === 'retirando';

  return (
    <div className={styles.envoltorio}>
      <button
        type="button"
        onClick={esperando ? retirar : alTocar}
        disabled={estado.paso === 'enviando' || estado.paso === 'retirando' || deshabilitado}
        className={styles.botonActivo}
      >
        {estado.paso === 'retirando'
          ? 'Retirando…'
          : estado.paso === 'enviado'
            ? 'Retirar la solicitud'
            : estado.paso === 'enviando'
              ? 'Enviando…'
              : 'Pedir sumarme'}
      </button>
      {estado.paso === 'enviado' && (
        <span className={styles.mensajeEspera}>Ya pediste sumarte: falta que te respondan.</span>
      )}
      {estado.paso === 'error' && <span className={styles.mensajeError}>{estado.mensaje}</span>}
    </div>
  );
}
