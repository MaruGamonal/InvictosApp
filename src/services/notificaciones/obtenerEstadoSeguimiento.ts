import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-42/UC-43 — ¿La persona que mira ya sigue esto? La ficha pública
 * (torneo o equipo) es la misma para cualquier visitante, cacheada por
 * evento (D-04b) — no puede saber quién la mira. Por eso `BotonSeguir`
 * arranca sin marcar y llama a esto recién montado en el cliente, con
 * la sesión real, para corregirse solo.
 *
 * A diferencia del resto de los servicios de este dominio, sin sesión
 * **no es un error**: es la respuesta correcta ("no, no seguís esto,
 * porque no hay ninguna cuenta"), así que devuelve `false` en vez de
 * `NO_AUTENTICADO` — este es un dato de lectura pública-por-persona, no
 * una acción que alguien tenga que autenticarse para pedir.
 */

const esquemaEntrada = z.object({
  tipoSeguido: z.enum(['tournament', 'team']),
  entidadId: z.string().uuid(),
});
export type ObtenerEstadoSeguimientoInput = z.infer<typeof esquemaEntrada>;

export const obtenerEstadoSeguimiento: Servicio<
  ObtenerEstadoSeguimientoInput,
  { siguiendo: boolean }
> = async (input, contexto) => {
  if (!contexto.usuarioId) return { siguiendo: false };
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT 1 FROM seguimiento WHERE usuario_id = $1 AND tipo_seguido = $2 AND entidad_seguida_id = $3`,
    [contexto.usuarioId, datos.tipoSeguido, datos.entidadId],
  );

  return { siguiendo: rows.length > 0 };
};
