import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-13 — Designar o quitar un rol interno del plantel. Exclusivo del
 * Capitán (`10`, 4.3) — a diferencia de invitar, esto reconfigura quién
 * gestiona o quién manda, y eso no lo resuelve el Delegado.
 *
 * Asignar `captain` es **transferir la titularidad**: quien la tenía
 * queda como cualquier otro integrante (su vínculo `captain` pasa a
 * `left`) y `equipo.perfil_capitan_id` (D-13, fuente única de verdad de
 * quién es capitán) se actualiza junto con el vínculo nuevo, en la misma
 * transacción — nunca puede quedar uno sin el otro.
 *
 * `delegate` y `coach` son designaciones directas sobre alguien que **ya
 * está en el plantel**: a diferencia de `invitarIntegrante`, no pasan
 * por un estado `invited` — el capitán ya tiene su confianza, es una
 * reconfiguración interna, no una propuesta que alguien de afuera tenga
 * que aceptar.
 */

const esquemaEntrada = z.object({
  equipoId: z.string().uuid(),
  perfilId: z.string().uuid(),
  rol: z.enum(['captain', 'delegate', 'coach']),
  accion: z.enum(['asignar', 'quitar']),
});
export type CambiarRolIntegranteInput = z.infer<typeof esquemaEntrada>;

export const cambiarRolIntegrante: Servicio<CambiarRolIntegranteInput, { ok: true }> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilPropioId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilPropioId, datos.equipoId, 'accion_de_capitan');

  const { rows: activoRows } = await pool.query(
    `SELECT 1 FROM integrante_equipo WHERE equipo_id = $1 AND perfil_id = $2 AND estado_vinculo = 'active'`,
    [datos.equipoId, datos.perfilId],
  );
  const yaIntegraElPlantel = activoRows.length > 0;

  if (datos.rol === 'captain') {
    if (datos.accion === 'quitar') {
      throw crearError('DATOS_INVALIDOS', [
        {
          campo: 'accion',
          problema: 'El capitán no se quita: se transfiere asignándolo a otro integrante.',
        },
      ]);
    }
    if (!yaIntegraElPlantel) {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'perfilId', problema: 'Solo puede ser capitán quien ya integra el plantel.' },
      ]);
    }

    const { rows } = await pool.query<{ perfil_capitan_id: string }>(
      'SELECT perfil_capitan_id FROM equipo WHERE id = $1',
      [datos.equipoId],
    );
    const capitanActualId = rows[0]?.perfil_capitan_id;
    if (!capitanActualId) throw crearError('NO_ENCONTRADO');
    if (capitanActualId === datos.perfilId) return { ok: true };

    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');

      await cliente.query('UPDATE equipo SET perfil_capitan_id = $1 WHERE id = $2', [
        datos.perfilId,
        datos.equipoId,
      ]);

      await cliente.query(
        `UPDATE integrante_equipo SET estado_vinculo = 'left', fecha_baja = now()
         WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = 'captain'`,
        [datos.equipoId, capitanActualId],
      );

      await cliente.query(
        `INSERT INTO integrante_equipo (equipo_id, perfil_id, rol_equipo, estado_vinculo, fecha_incorporacion)
         VALUES ($1, $2, 'captain', 'active', now())
         ON CONFLICT (equipo_id, perfil_id, rol_equipo)
         DO UPDATE SET estado_vinculo = 'active', fecha_incorporacion = now(), fecha_baja = NULL`,
        [datos.equipoId, datos.perfilId],
      );

      await cliente.query('COMMIT');
      return { ok: true };
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  // delegate | coach
  if (datos.accion === 'asignar') {
    if (!yaIntegraElPlantel) {
      throw crearError('DATOS_INVALIDOS', [
        {
          campo: 'perfilId',
          problema: 'Solo se le pueden designar roles a quien ya integra el plantel.',
        },
      ]);
    }
    await pool.query(
      `INSERT INTO integrante_equipo (equipo_id, perfil_id, rol_equipo, estado_vinculo, fecha_incorporacion)
       VALUES ($1, $2, $3, 'active', now())
       ON CONFLICT (equipo_id, perfil_id, rol_equipo)
       DO UPDATE SET estado_vinculo = 'active', fecha_incorporacion = now(), fecha_baja = NULL`,
      [datos.equipoId, datos.perfilId, datos.rol],
    );
    return { ok: true };
  }

  // quitar delegate | coach — no toca sus otros vínculos (p.ej. player) en el equipo.
  await pool.query(
    `UPDATE integrante_equipo SET estado_vinculo = 'left', fecha_baja = now()
     WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = $3 AND estado_vinculo = 'active'`,
    [datos.equipoId, datos.perfilId, datos.rol],
  );
  return { ok: true };
};
