import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-52 — Quitar a un colaborador de un torneo. No borra el vínculo:
 * lo pasa a `removed` (`10`, 4.2), porque su historial de cargas tiene
 * que seguir siendo atribuible — es el dato que resuelve una discusión
 * sobre quién cargó qué resultado.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  usuarioId: z.string().uuid(),
});
export type QuitarColaboradorInput = z.infer<typeof esquemaEntrada>;

export const quitarColaborador: Servicio<QuitarColaboradorInput, { estado: 'removed' }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'asignar_colaboradores');

  const pool = obtenerPool();
  const { rowCount } = await pool.query(
    `UPDATE colaborador_torneo SET estado = 'removed'
     WHERE torneo_id = $1 AND usuario_id = $2 AND estado = 'active'`,
    [datos.torneoId, datos.usuarioId],
  );
  if (!rowCount) throw crearError('NO_ENCONTRADO');

  return { estado: 'removed' };
};
