import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { invalidarCacheEquipo, invalidarCacheTorneo } from '@/lib/cache';

/**
 * UC-42 / UC-43 — Seguir un torneo o un equipo. Es la acción de
 * conversión de menor compromiso del producto (`02`, UC-42): inmediata,
 * reversible y sin que nadie más intervenga. Idempotente (`10`, 2.6):
 * seguir dos veces no duplica ni falla.
 *
 * La ficha pública del torneo/equipo cachea su cantidad de seguidores —
 * sin invalidar acá, quedaría desactualizada para cualquiera que no sea
 * quien acaba de seguir (su propio conteo se corrige solo, en el
 * cliente, vía `BotonSeguir`).
 */

const esquemaEntrada = z.object({
  tipoSeguido: z.enum(['tournament', 'team']),
  entidadId: z.string().uuid(),
});
export type SeguirInput = z.infer<typeof esquemaEntrada>;

export const seguir: Servicio<SeguirInput, { siguiendo: true }> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();

  // `seguimiento` apunta a un equipo o a un torneo según `tipo_seguido`,
  // así que no hay clave foránea que lo sostenga: sin esta comprobación,
  // cualquier id inventado entraba y quedaba una fila que no lleva a
  // ningún lado, que después aparece en el feed y en los conteos.
  const tabla = datos.tipoSeguido === 'team' ? 'equipo' : 'torneo';
  const { rowCount } = await pool.query(`SELECT 1 FROM ${tabla} WHERE id = $1`, [datos.entidadId]);
  if (!rowCount) throw crearError('NO_ENCONTRADO');

  await pool.query(
    `INSERT INTO seguimiento (usuario_id, tipo_seguido, entidad_seguida_id, origen)
     VALUES ($1, $2, $3, 'manual')
     ON CONFLICT (usuario_id, tipo_seguido, entidad_seguida_id) DO NOTHING`,
    [contexto.usuarioId, datos.tipoSeguido, datos.entidadId],
  );

  if (datos.tipoSeguido === 'tournament') invalidarCacheTorneo(datos.entidadId);
  else invalidarCacheEquipo(datos.entidadId);

  return { siguiendo: true };
};
