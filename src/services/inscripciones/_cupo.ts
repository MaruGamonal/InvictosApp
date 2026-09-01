import type { PoolClient } from 'pg';

/**
 * Cierra automáticamente las inscripciones al alcanzarse el cupo, en la
 * misma transacción que aprobó la inscripción que lo completó (`10`,
 * 2.5: es una de las cuatro operaciones transaccionales del MVP). Solo
 * cierra si el torneo seguía `registration_open` — si ya estaba en otro
 * estado, no hace nada.
 */
export async function cerrarTorneoSiCupoCompleto(
  cliente: PoolClient,
  torneoId: string,
): Promise<void> {
  const { rows } = await cliente.query<{ cupo_equipos: number; aprobados: string }>(
    `SELECT t.cupo_equipos,
            (SELECT count(*) FROM inscripcion i WHERE i.torneo_id = t.id AND i.estado = 'approved') AS aprobados
     FROM torneo t WHERE t.id = $1`,
    [torneoId],
  );
  const fila = rows[0];
  if (!fila || Number(fila.aprobados) < fila.cupo_equipos) return;

  await cliente.query(
    `UPDATE torneo SET estado = 'registration_closed', version = version + 1
     WHERE id = $1 AND estado = 'registration_open'`,
    [torneoId],
  );
}

/**
 * Promueve al primero de la lista de espera cuando se libera un cupo.
 * T12 no tiene ningún camino propio que libere un cupo ya aprobado —
 * eso es de T17 (baja de un equipo) — así que esta función se exporta
 * para que T17 la llame dentro de su propia transacción.
 */
export async function promoverListaDeEspera(
  cliente: PoolClient,
  torneoId: string,
): Promise<string | null> {
  const { rows } = await cliente.query<{ equipo_id: string }>(
    `SELECT equipo_id FROM inscripcion
     WHERE torneo_id = $1 AND estado = 'waitlisted'
     ORDER BY fecha_solicitud ASC LIMIT 1`,
    [torneoId],
  );
  const siguiente = rows[0];
  if (!siguiente) return null;

  await cliente.query(
    `UPDATE inscripcion SET estado = 'approved', fecha_resolucion = now()
     WHERE torneo_id = $1 AND equipo_id = $2`,
    [torneoId, siguiente.equipo_id],
  );
  return siguiente.equipo_id;
}
