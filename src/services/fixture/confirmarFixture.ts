import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-29 — Confirma la propuesta (ya ajustada por el organizador si
 * hacía falta) y crea los partidos. Una de las cuatro operaciones
 * transaccionales del MVP (`10`, 2.5): escribe todos los `partido` de
 * la fase **y** la asignación de `grupo` en cada `inscripcion`, juntos.
 *
 * Regenerar sobre partidos ya jugados es destructivo (`06`, D-31b) y
 * exige `confirmoPerdidaDeResultados` explícito; sin eso, se rechaza
 * con `FIXTURE_CON_PARTIDOS_JUGADOS` y el detalle de cuántos se
 * perderían, para que la interfaz lo enumere antes de que la persona
 * confirme.
 */

const esquemaEntrada = z.object({
  faseId: z.string().uuid(),
  partidos: z
    .array(
      z.object({
        numeroFecha: z.number().int().positive(),
        equipoLocalId: z.string().uuid(),
        equipoVisitanteId: z.string().uuid(),
        grupoId: z.string().uuid().nullable(),
      }),
    )
    .min(1),
  asignacionesGrupo: z
    .array(z.object({ equipoId: z.string().uuid(), grupoId: z.string().uuid() }))
    .optional(),
  confirmoPerdidaDeResultados: z.boolean().optional(),
});
export type ConfirmarFixtureInput = z.infer<typeof esquemaEntrada>;

export const confirmarFixture: Servicio<
  ConfirmarFixtureInput,
  { partidosCreados: number }
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: faseRows } = await pool.query<{ torneo_id: string }>(
    'SELECT torneo_id FROM fase WHERE id = $1',
    [datos.faseId],
  );
  const fase = faseRows[0];
  if (!fase) throw crearError('NO_ENCONTRADO');
  await verificarPermisoTorneo(contexto, fase.torneo_id, 'configurar_torneo');

  const { rows: jugadosRows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM partido WHERE fase_id = $1 AND estado = 'played'`,
    [datos.faseId],
  );
  const partidosJugados = Number(jugadosRows[0]!.count);
  if (partidosJugados > 0 && !datos.confirmoPerdidaDeResultados) {
    throw crearError('FIXTURE_CON_PARTIDOS_JUGADOS', { cantidadPartidosJugados: partidosJugados });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `DELETE FROM evento_partido WHERE partido_id IN (SELECT id FROM partido WHERE fase_id = $1)`,
      [datos.faseId],
    );
    await cliente.query(
      `DELETE FROM disputa_resultado WHERE partido_id IN (SELECT id FROM partido WHERE fase_id = $1)`,
      [datos.faseId],
    );
    await cliente.query('DELETE FROM partido WHERE fase_id = $1', [datos.faseId]);

    for (const asignacion of datos.asignacionesGrupo ?? []) {
      await cliente.query(
        'UPDATE inscripcion SET grupo_id = $1 WHERE torneo_id = $2 AND equipo_id = $3',
        [asignacion.grupoId, fase.torneo_id, asignacion.equipoId],
      );
    }

    for (const p of datos.partidos) {
      await cliente.query(
        `INSERT INTO partido (torneo_id, fase_id, grupo_id, numero_fecha, equipo_local_id, equipo_visitante_id, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'unscheduled')`,
        [
          fase.torneo_id,
          datos.faseId,
          p.grupoId,
          p.numeroFecha,
          p.equipoLocalId,
          p.equipoVisitanteId,
        ],
      );
    }

    await cliente.query('COMMIT');
    return { partidosCreados: datos.partidos.length };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
