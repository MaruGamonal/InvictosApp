import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';
import { notificar } from '@/services/notificaciones/notificar';
import { seguirEquipoAutomaticamente } from './_vinculo';

/**
 * UC-53 — Resolver una solicitud de ingreso, por Capitán o Delegado
 * (`06`, D-86: los mismos que invitan). Aceptar → `active` y la persona
 * pasa a seguir al equipo automáticamente (UC-43); rechazar → `declined`,
 * que no se expone en ninguna superficie pública (`04`, 3.6).
 *
 * Notifica `team_join_resolved` a quien solicitó (nuevo en este ticket).
 */

const esquemaEntrada = z.object({
  equipoId: z.string().uuid(),
  perfilId: z.string().uuid(),
  aceptar: z.boolean(),
});
export type ResolverSolicitudIngresoInput = z.infer<typeof esquemaEntrada>;

export const resolverSolicitudIngreso: Servicio<
  ResolverSolicitudIngresoInput,
  { estado: 'active' | 'declined' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilPropioRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilPropioId = perfilPropioRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilPropioId, datos.equipoId, 'gestionar_plantel');

  const nuevoEstado = datos.aceptar ? 'active' : 'declined';
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rowCount } = await cliente.query(
      `UPDATE integrante_equipo
       SET estado_vinculo = $3, fecha_incorporacion = ${datos.aceptar ? 'now()' : 'NULL'}
       WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = 'player' AND estado_vinculo = 'requested'`,
      [datos.equipoId, datos.perfilId, nuevoEstado],
    );
    if (!rowCount) throw crearError('NO_ENCONTRADO');

    const { rows: perfilRows } = await cliente.query<{ usuario_id: string | null }>(
      'SELECT usuario_id FROM perfil_deportivo WHERE id = $1',
      [datos.perfilId],
    );
    const usuarioIdSolicitante = perfilRows[0]?.usuario_id ?? null;

    if (datos.aceptar && usuarioIdSolicitante) {
      await seguirEquipoAutomaticamente(cliente, usuarioIdSolicitante, datos.equipoId);
    }

    await cliente.query('COMMIT');

    if (usuarioIdSolicitante) {
      await notificar(
        {
          tipo: 'team_join_resolved',
          entidadOrigenTipo: 'equipo',
          entidadOrigenId: datos.equipoId,
          destinatarios: { usuarioIds: [usuarioIdSolicitante] },
        },
        contexto,
      );
    }

    return { estado: nuevoEstado };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
