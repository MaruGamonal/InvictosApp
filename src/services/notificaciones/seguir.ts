import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-42 / UC-43 — Seguir un torneo o un equipo. Es la acción de
 * conversión de menor compromiso del producto (`02`, UC-42): inmediata,
 * reversible y sin que nadie más intervenga. Idempotente (`10`, 2.6):
 * seguir dos veces no duplica ni falla.
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
  await pool.query(
    `INSERT INTO seguimiento (usuario_id, tipo_seguido, entidad_seguida_id, origen)
     VALUES ($1, $2, $3, 'manual')
     ON CONFLICT (usuario_id, tipo_seguido, entidad_seguida_id) DO NOTHING`,
    [contexto.usuarioId, datos.tipoSeguido, datos.entidadId],
  );

  return { siguiendo: true };
};
