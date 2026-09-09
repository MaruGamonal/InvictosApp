import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { obtenerRolesEnEquipo, type RolEquipo } from '@/lib/permisos';

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ObtenerMiRolEnEquipoInput = z.infer<typeof esquemaEntrada>;

/**
 * ¿Qué rol tengo en este equipo? Sin sesión, o con sesión pero sin
 * vínculo activo con el equipo, `{ roles: [] }` — no es un error, es la
 * respuesta correcta para alguien que solo está mirando la ficha.
 */
export const obtenerMiRolEnEquipo: Servicio<
  ObtenerMiRolEnEquipoInput,
  { roles: RolEquipo[] }
> = async (input, contexto) => {
  if (!contexto.usuarioId) return { roles: [] };
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_deportivo WHERE usuario_id = $1`,
    [contexto.usuarioId],
  );
  const perfilId = rows[0]?.id;
  if (!perfilId) return { roles: [] };

  const roles = await obtenerRolesEnEquipo(perfilId, datos.equipoId);
  return { roles };
};
