import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';
import { notificar } from '@/services/notificaciones/notificar';

/**
 * T29 — El organizador rechaza una objeción: el resultado cargado
 * queda firme tal como está.
 *
 * Es **una** de las dos salidas de una objeción, y la más simple. La
 * otra no vive acá: si el organizador le da la razón a quien objetó,
 * corrige el resultado con `cargarResultado`, que ya recalcula la
 * tabla, rehace los eventos y cierra la objeción como `upheld` por su
 * cuenta. Duplicar acá ese camino habría sido reescribir la operación
 * transaccional más delicada del producto para cambiarle una columna.
 *
 * Por eso este servicio sólo hace el rechazo: cerrar la objeción y
 * confirmar. Sin él, una objeción abierta deja el partido en suspenso
 * para siempre —ni el rival ni la tarea de las 72 horas lo confirman
 * (`06`, D-60)—, y con él la tabla de posiciones deja de quedar
 * provisoria por algo que nadie puede destrabar.
 */

const esquemaEntrada = z.object({
  partidoId: z.string().uuid(),
  resolucion: z.string().trim().min(10).max(500),
});
export type ResolverDisputaInput = z.infer<typeof esquemaEntrada>;

export interface DisputaResuelta {
  estadoDisputa: 'rejected';
  estadoResultado: 'confirmed';
}

export const resolverDisputa: Servicio<ResolverDisputaInput, DisputaResuelta> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    torneo_id: string;
    equipo_local_id: string;
    equipo_visitante_id: string;
    estado_resultado: string;
  }>(
    `SELECT torneo_id, equipo_local_id, equipo_visitante_id, estado_resultado
     FROM partido WHERE id = $1`,
    [datos.partidoId],
  );
  const partido = rows[0];
  if (!partido) throw crearError('NO_ENCONTRADO');

  // El mismo permiso que carga resultados: quien puede decidir un
  // resultado puede decidir una objeción sobre él.
  await verificarPermisoTorneo(contexto, partido.torneo_id, 'cargar_resultados');

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    // El `WHERE estado = 'open'` es el candado: si otra persona la
    // resolvió mientras tanto, no hay filas y no se pisa su decisión.
    const { rows: cerradas } = await cliente.query<{ id: string }>(
      `UPDATE disputa_resultado
       SET estado = 'rejected', resolucion = $2, resuelta_por_usuario_id = $3
       WHERE partido_id = $1 AND estado = 'open'
       RETURNING id`,
      [datos.partidoId, datos.resolucion, contexto.usuarioId],
    );
    if (cerradas.length === 0) throw crearError('OBJECION_NO_ABIERTA');

    await cliente.query(
      `UPDATE partido
       SET estado_resultado = 'confirmed', fecha_confirmacion_resultado = now(),
           confirmado_por_vencimiento = false, version = version + 1
       WHERE id = $1`,
      [datos.partidoId],
    );

    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }

  invalidarCacheTorneo(partido.torneo_id);
  invalidarCacheEquipo(partido.equipo_local_id);
  invalidarCacheEquipo(partido.equipo_visitante_id);

  // El resultado quedó firme: eso es una novedad del torneo, así que
  // sale por el mismo tipo que cualquier resultado publicado.
  await notificar(
    {
      tipo: 'result_published',
      entidadOrigenTipo: 'partido',
      entidadOrigenId: datos.partidoId,
      destinatarios: {
        seguidoresDe: [
          { tipoSeguido: 'tournament', entidadId: partido.torneo_id },
          { tipoSeguido: 'team', entidadId: partido.equipo_local_id },
          { tipoSeguido: 'team', entidadId: partido.equipo_visitante_id },
        ],
      },
    },
    contexto,
  );

  return { estadoDisputa: 'rejected', estadoResultado: 'confirmed' };
};
