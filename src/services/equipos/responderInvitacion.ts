import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { seguirEquipoAutomaticamente } from './_vinculo';

/**
 * UC-12 — Responder a una invitación al plantel. Una invitación puede
 * traer varios roles a la vez (jugador y DT, por ejemplo); aceptarla o
 * rechazarla resuelve **todos** los vínculos `invited` pendientes de esa
 * persona en ese equipo de una sola vez, no rol por rol.
 *
 * Rechazar no deja rastro público (`04`, 3.6): el estado `declined` no
 * se expone en ninguna superficie.
 */

const esquemaEntrada = z.object({
  equipoId: z.string().uuid(),
  aceptar: z.boolean(),
});
export type ResponderInvitacionInput = z.infer<typeof esquemaEntrada>;

export const responderInvitacion: Servicio<
  ResponderInvitacionInput,
  { rolesResueltos: number }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) throw crearError('NO_ENCONTRADO');

  const nuevoEstado = datos.aceptar ? 'active' : 'declined';
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rowCount } = await cliente.query(
      `UPDATE integrante_equipo
       SET estado_vinculo = $3, fecha_incorporacion = ${datos.aceptar ? 'now()' : 'NULL'}
       WHERE equipo_id = $1 AND perfil_id = $2 AND estado_vinculo = 'invited'`,
      [datos.equipoId, perfilId, nuevoEstado],
    );
    if (!rowCount) throw crearError('NO_ENCONTRADO');

    if (datos.aceptar) {
      await seguirEquipoAutomaticamente(cliente, contexto.usuarioId, datos.equipoId);
    }

    await cliente.query('COMMIT');
    return { rolesResueltos: rowCount };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
