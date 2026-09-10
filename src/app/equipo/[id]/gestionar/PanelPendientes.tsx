'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import type {
  InvitacionPendiente,
  SolicitudPendiente,
} from '@/services/equipos/obtenerGestionEquipo';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  invitacionesPendientes: InvitacionPendiente[];
  solicitudesPendientes: SolicitudPendiente[];
}

/** Invitaciones enviadas y solicitudes de ingreso, ambas pendientes de resolver — Capitán o Delegado. */
export function PanelPendientes({
  equipoId,
  invitacionesPendientes,
  solicitudesPendientes,
}: Props) {
  const router = useRouter();
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function llamar(clave: string, url: string, body: object) {
    setEnviandoId(clave);
    setError(null);
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo resolver. Probá de nuevo.');
        setEnviandoId(null);
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviandoId(null);
    }
  }

  if (invitacionesPendientes.length === 0 && solicitudesPendientes.length === 0) return null;

  return (
    <section className={styles.seccion}>
      <h2 className={styles.tituloSeccion}>Pendientes</h2>
      {error && <p className={styles.errorChico}>{error}</p>}

      {invitacionesPendientes.length > 0 && (
        <div className={styles.lista}>
          <span className={styles.subtitulo}>Invitaciones enviadas</span>
          {invitacionesPendientes.map((invitacion) => {
            const clave = `${invitacion.perfilId}:${invitacion.rol}`;
            return (
              <div key={clave} className={styles.filaPendiente}>
                <span>
                  {invitacion.nombreVisible} ·{' '}
                  {obtenerEtiqueta('integranteEquipo.rolEquipo', invitacion.rol).etiqueta}
                </span>
                <button
                  type="button"
                  className={styles.botonSecundarioChico}
                  disabled={enviandoId === clave}
                  onClick={() =>
                    llamar(clave, '/api/equipos/cancelar-invitacion', {
                      equipoId,
                      perfilId: invitacion.perfilId,
                      rol: invitacion.rol,
                    })
                  }
                >
                  Cancelar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {solicitudesPendientes.length > 0 && (
        <Link
          href={`/equipo/${equipoId}/gestionar/solicitudes`}
          className={styles.enlaceSolicitudes}
        >
          Ver solicitudes de ingreso ({solicitudesPendientes.length})
        </Link>
      )}
    </section>
  );
}
