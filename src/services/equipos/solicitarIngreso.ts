import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { notificar } from '@/services/notificaciones/notificar';
import { obtenerRolesEnEquipo } from '@/lib/permisos';
import { upsertVinculo } from './_vinculo';

/**
 * UC-53 — Solicitar sumarse a un equipo: el camino inverso a
 * `invitarIntegrante`. Siempre pide el rol `player`, no parametrizable
 * (`06`, D-85) — los demás roles son designaciones del capitán.
 *
 * Notifica `team_join_requested` a Capitán y Delegados (nuevo en este
 * ticket, `04`, 4.12).
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type SolicitarIngresoInput = z.infer<typeof esquemaEntrada>;

export const solicitarIngreso: Servicio<
  SolicitarIngresoInput,
  { estado: 'requested' | 'active' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: equipoRows } = await pool.query<{ estado: string }>(
    'SELECT estado FROM equipo WHERE id = $1',
    [datos.equipoId],
  );
  const equipo = equipoRows[0];
  if (!equipo) throw crearError('NO_ENCONTRADO');
  if (equipo.estado === 'archived') {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'equipoId', problema: 'Este equipo está archivado.' },
    ]);
  }

  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) throw crearError('NO_ENCONTRADO');

  const rolesActuales = await obtenerRolesEnEquipo(perfilId, datos.equipoId);
  if (rolesActuales.includes('player')) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'equipoId', problema: 'Ya integrás este plantel como jugador.' },
    ]);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { estadoResultante, huboCruce } = await upsertVinculo(cliente, {
      equipoId: datos.equipoId,
      perfilId,
      rol: 'player',
      estadoPropuesto: 'requested',
      estadoSiSinContraparte: 'requested',
    });

    await cliente.query('COMMIT');

    if (huboCruce) {
      return { estado: 'active' };
    }

    const { rows: gestores } = await pool.query<{ perfil_id: string; usuario_id: string | null }>(
      `SELECT ie.perfil_id, pd.usuario_id
         FROM integrante_equipo ie
         JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
         WHERE ie.equipo_id = $1 AND ie.estado_vinculo = 'active' AND ie.rol_equipo IN ('captain', 'delegate')`,
      [datos.equipoId],
    );
    const destinatarios = gestores
      .map((g) => g.usuario_id)
      .filter((id): id is string => id !== null);

    if (destinatarios.length > 0) {
      await notificar(
        {
          tipo: 'team_join_requested',
          entidadOrigenTipo: 'equipo',
          entidadOrigenId: datos.equipoId,
          destinatarios: { usuarioIds: destinatarios },
        },
        contexto,
      );
    }

    return { estado: estadoResultante as 'requested' | 'active' };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
