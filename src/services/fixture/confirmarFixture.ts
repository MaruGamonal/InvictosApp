import { z } from 'zod';
import type { PoolClient } from 'pg';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheTorneo } from '@/lib/cache';

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

/**
 * La propuesta llega desde el cliente, así que los equipos y los grupos
 * que trae son entrada sin validar. Sin esto, quien puede configurar
 * **su** torneo podía crear partidos con cualquier equipo de la
 * plataforma —que aparecía después en la tabla del torneo y en el perfil
 * público de ese equipo, sin que su capitán hubiera inscripto nada—,
 * partidos de un equipo contra sí mismo, y partidos apuntando al grupo
 * de otro torneo, que corrompe la tabla de ese otro.
 *
 * Son los mismos tres estados imposibles que el validador del dataset
 * busca después de los hechos: acá se impiden antes.
 */
async function verificarPropuesta(
  cliente: PoolClient,
  torneoId: string,
  faseId: string,
  datos: ConfirmarFixtureInput,
): Promise<void> {
  const invalido = (campo: string, problema: string) =>
    crearError('DATOS_INVALIDOS', [{ campo, problema }]);

  for (const p of datos.partidos) {
    if (p.equipoLocalId === p.equipoVisitanteId) {
      throw invalido('partidos', 'Un partido no puede ser de un equipo contra sí mismo.');
    }
  }

  const equipos = new Set<string>();
  for (const p of datos.partidos) {
    equipos.add(p.equipoLocalId);
    equipos.add(p.equipoVisitanteId);
  }
  for (const a of datos.asignacionesGrupo ?? []) equipos.add(a.equipoId);

  const { rows: inscriptos } = await cliente.query<{ equipo_id: string }>(
    `SELECT equipo_id FROM inscripcion
     WHERE torneo_id = $1 AND equipo_id = ANY($2) AND estado = 'approved'`,
    [torneoId, [...equipos]],
  );
  if (inscriptos.length !== equipos.size) {
    throw invalido(
      'partidos',
      'Hay equipos en el fixture que no están inscriptos y aprobados en este torneo.',
    );
  }

  const grupos = new Set<string>();
  for (const p of datos.partidos) if (p.grupoId) grupos.add(p.grupoId);
  for (const a of datos.asignacionesGrupo ?? []) grupos.add(a.grupoId);

  if (grupos.size > 0) {
    const { rows: propios } = await cliente.query<{ id: string }>(
      'SELECT id FROM grupo WHERE id = ANY($1) AND fase_id = $2',
      [[...grupos], faseId],
    );
    if (propios.length !== grupos.size) {
      throw invalido('partidos', 'Hay zonas que no pertenecen a esta fase del torneo.');
    }
  }
}

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

    // Antes de los borrados: una propuesta inválida no tiene que
    // destruir el fixture que ya estaba.
    await verificarPropuesta(cliente, fase.torneo_id, datos.faseId, datos);

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
    invalidarCacheTorneo(fase.torneo_id);
    return { partidosCreados: datos.partidos.length };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
