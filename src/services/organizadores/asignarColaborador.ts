import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-52 — Asignar un colaborador a un torneo puntual. A diferencia del
 * Administrador (UC-07), el Colaborador no alcanza a ningún otro
 * torneo, ni siquiera de la misma organización (`06`, D-32, D-34). Sus
 * permisos son fijos: la entidad no tiene atributo de rol.
 *
 * Idempotente (`10`, 2.6): asignar dos veces a la misma persona
 * confirma el vínculo existente — y, si estaba `removed`, lo reactiva.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  usuarioId: z.string().uuid(),
});
export type AsignarColaboradorInput = z.infer<typeof esquemaEntrada>;

export const asignarColaborador: Servicio<AsignarColaboradorInput, { estado: 'active' }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'asignar_colaboradores');
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  await pool.query(
    `INSERT INTO colaborador_torneo (torneo_id, usuario_id, estado, asignado_por_usuario_id)
     VALUES ($1, $2, 'active', $3)
     ON CONFLICT (torneo_id, usuario_id)
     DO UPDATE SET estado = 'active', asignado_por_usuario_id = $3`,
    [datos.torneoId, datos.usuarioId, contexto.usuarioId],
  );

  return { estado: 'active' };
};
