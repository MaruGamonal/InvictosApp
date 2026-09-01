import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-42 / UC-43 — Dejar de seguir un torneo o un equipo, en cualquier
 * momento. Idempotente: dejar de seguir algo que ya no se sigue no falla.
 */

const esquemaEntrada = z.object({
  tipoSeguido: z.enum(['tournament', 'team']),
  entidadId: z.string().uuid(),
});
export type DejarDeSeguirInput = z.infer<typeof esquemaEntrada>;

export const dejarDeSeguir: Servicio<DejarDeSeguirInput, { siguiendo: false }> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  await pool.query(
    'DELETE FROM seguimiento WHERE usuario_id = $1 AND tipo_seguido = $2 AND entidad_seguida_id = $3',
    [contexto.usuarioId, datos.tipoSeguido, datos.entidadId],
  );

  return { siguiendo: false };
};
