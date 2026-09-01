import { obtenerPool } from '@/db/cliente';
import { notificar } from '@/services/notificaciones/notificar';
import type { Contexto } from '@/lib/contexto';
import type { TipoNotificacion } from '@/services/notificaciones/tipos';

/**
 * Destinatarios de un cambio de torneo: los capitanes y delegados de
 * los equipos con inscripción aprobada, más quienes siguen el torneo
 * (`02`, UC-19, UC-21, UC-46). Se usa desde `cancelarTorneo`,
 * `actualizarTorneo` (los cinco campos de D-22b) y `avanzarEstado`
 * (inicio/fin, `04`, 4.12).
 */
export async function notificarCambioDeTorneo(
  torneoId: string,
  tipo: TipoNotificacion,
  contexto: Contexto,
): Promise<void> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ usuario_id: string | null }>(
    `SELECT DISTINCT pd.usuario_id
     FROM inscripcion i
     JOIN integrante_equipo ie
       ON ie.equipo_id = i.equipo_id AND ie.estado_vinculo = 'active' AND ie.rol_equipo IN ('captain', 'delegate')
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE i.torneo_id = $1 AND i.estado = 'approved'`,
    [torneoId],
  );
  const usuarioIds = rows.map((r) => r.usuario_id).filter((id): id is string => id !== null);

  await notificar(
    {
      tipo,
      entidadOrigenTipo: 'torneo',
      entidadOrigenId: torneoId,
      destinatarios: {
        usuarioIds,
        seguidoresDe: [{ tipoSeguido: 'tournament', entidadId: torneoId }],
      },
    },
    contexto,
  );
}
