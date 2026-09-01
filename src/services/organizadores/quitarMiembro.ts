import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';

/**
 * UC-07 — Quitar a un Administrador del equipo de trabajo. El rol de
 * Titular no se quita por esta vía (`06`, D-64): eso es `transferirTitularidad`
 * (UC-09, fase futura). A diferencia del Colaborador (`10`, 4.2),
 * `miembro_organizacion` no tiene atributo de estado — desvincular es
 * borrar el vínculo, no darlo de baja lógica, porque nada más en el
 * esquema queda atribuido a esa fila.
 */

const esquemaEntrada = z.object({
  organizacionId: z.string().uuid(),
  usuarioId: z.string().uuid(),
});
export type QuitarMiembroInput = z.infer<typeof esquemaEntrada>;

export const quitarMiembro: Servicio<QuitarMiembroInput, { ok: true }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'gestionar_administradores');

  const pool = obtenerPool();
  const { rows: organizacion } = await pool.query<{ usuario_titular_id: string }>(
    'SELECT usuario_titular_id FROM organizacion WHERE id = $1',
    [datos.organizacionId],
  );
  if (!organizacion[0]) throw crearError('NO_ENCONTRADO');
  if (organizacion[0].usuario_titular_id === datos.usuarioId) {
    throw crearError('ROL_TITULAR_NO_GESTIONABLE');
  }

  await pool.query(
    `DELETE FROM miembro_organizacion WHERE organizacion_id = $1 AND usuario_id = $2 AND rol = 'admin'`,
    [datos.organizacionId, datos.usuarioId],
  );

  return { ok: true };
};
