import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';
import { notificar } from '@/services/notificaciones/notificar';
import { usuariosQueGestionanElTorneo } from '@/lib/permisos';
import { puedeResponderPorElEquipo, resolverEquipoQueResponde } from './_rival';

/**
 * T29 — El equipo rival objeta un resultado cargado por el otro.
 *
 * La otra mitad de `confirmarResultado`: el mismo permiso y el mismo
 * momento, con la salida contraria. Quien puede confirmar puede objetar,
 * porque si no se le estaría ofreciendo un solo camino a quien no está
 * de acuerdo.
 *
 * **Objetar congela el plazo** (`06`, D-60). La tarea horaria ignora los
 * partidos con objeción abierta y `confirmarResultado` la revalida, así
 * que una vez abierta el resultado no se confirma solo: lo resuelve el
 * organizador. Eso es a propósito y es también el riesgo del diseño —
 * una objeción sin resolver deja el partido y la tabla en suspenso, por
 * eso `resolverDisputa` se construyó en la misma tanda y no después.
 *
 * El motivo es obligatorio. Una objeción sin motivo le deja al
 * organizador el trabajo de adivinar qué se discute, y encima por
 * chat.
 */

const esquemaEntrada = z.object({
  partidoId: z.string().uuid(),
  motivo: z.string().trim().min(10).max(500),
});
export type DisputarResultadoInput = z.infer<typeof esquemaEntrada>;

export interface ResultadoObjetado {
  estadoResultado: 'disputed';
  disputaId: string;
}

export const disputarResultado: Servicio<DisputarResultadoInput, ResultadoObjetado> = async (
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
    cargado_por_usuario_id: string | null;
  }>(
    `SELECT torneo_id, equipo_local_id, equipo_visitante_id, estado_resultado,
            cargado_por_usuario_id
     FROM partido WHERE id = $1`,
    [datos.partidoId],
  );
  const partido = rows[0];
  if (!partido) throw crearError('NO_ENCONTRADO');

  // El permiso vive acá y no en la ruta ni en la pantalla: esconder el
  // botón no impide que a la API se le pegue directo.
  const equipoQueResponde = await resolverEquipoQueResponde(pool, partido);
  if (!equipoQueResponde) throw crearError('SIN_PERMISO');
  if (!(await puedeResponderPorElEquipo(pool, contexto, equipoQueResponde))) {
    throw crearError('SIN_PERMISO');
  }

  // Sólo se objeta lo que todavía está esperando respuesta. Un
  // resultado ya confirmado —por el rival o por el plazo— no se
  // reabre desde acá: eso lo corrige el organizador.
  if (partido.estado_resultado !== 'loaded') throw crearError('RESULTADO_NO_OBJETABLE');

  const { rows: abiertas } = await pool.query(
    `SELECT 1 FROM disputa_resultado WHERE partido_id = $1 AND estado = 'open' LIMIT 1`,
    [datos.partidoId],
  );
  if (abiertas.length > 0) throw crearError('OBJECION_YA_ABIERTA');

  // Las dos escrituras van juntas: un partido en `disputed` sin su
  // objeción no se puede resolver ni explicar, y una objeción abierta
  // sobre un partido que sigue en `loaded` lo confirmaría el plazo.
  const cliente = await pool.connect();
  let disputaId: string;
  try {
    await cliente.query('BEGIN');

    const { rows: creadas } = await cliente.query<{ id: string }>(
      `INSERT INTO disputa_resultado (partido_id, presentada_por_usuario_id, equipo_id, motivo)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [datos.partidoId, contexto.usuarioId, equipoQueResponde, datos.motivo],
    );
    disputaId = creadas[0]!.id;

    const { rows: actualizados } = await cliente.query(
      `UPDATE partido SET estado_resultado = 'disputed', version = version + 1
       WHERE id = $1 AND estado_resultado = 'loaded'
       RETURNING id`,
      [datos.partidoId],
    );
    // Alguien confirmó el resultado entre la lectura de arriba y este
    // UPDATE. La objeción llegó tarde y no se guarda a medias.
    if (actualizados.length === 0) throw crearError('RESULTADO_NO_OBJETABLE');

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

  // Le llega a quien puede resolverla, no a los seguidores: una
  // objeción es trabajo del organizador, no una novedad del torneo.
  await notificar(
    {
      tipo: 'result_disputed',
      entidadOrigenTipo: 'partido',
      entidadOrigenId: datos.partidoId,
      destinatarios: { usuarioIds: await usuariosQueGestionanElTorneo(partido.torneo_id) },
    },
    contexto,
  );

  return { estadoResultado: 'disputed', disputaId };
};
