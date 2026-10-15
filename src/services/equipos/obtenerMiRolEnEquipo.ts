import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import {
  obtenerRolesEnEquipo,
  tieneSolicitudDeIngresoPendiente,
  type RolEquipo,
} from '@/lib/permisos';

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ObtenerMiRolEnEquipoInput = z.infer<typeof esquemaEntrada>;

/**
 * ¿Qué rol tengo en este equipo? Sin sesión, o con sesión pero sin
 * vínculo activo con el equipo, `{ roles: [] }` — no es un error, es la
 * respuesta correcta para alguien que solo está mirando la ficha.
 *
 * **`solicitudPendiente` es aparte de los roles** porque una solicitud
 * no es un rol: quien pidió sumarse todavía no es nada del equipo. Pero
 * la ficha necesita saberlo, y no lo sabía: al recargar la pantalla
 * volvía a ofrecer "Pedir sumarme" como si no hubiera pedido nada, y no
 * había ninguna forma de retirar el pedido —`retirarSolicitudIngreso`
 * existía, con su ruta, y no lo llamaba ninguna pantalla—.
 */
export const obtenerMiRolEnEquipo: Servicio<
  ObtenerMiRolEnEquipoInput,
  { roles: RolEquipo[]; perfilId: string | null; solicitudPendiente: boolean }
> = async (input, contexto) => {
  if (!contexto.usuarioId) return { roles: [], perfilId: null, solicitudPendiente: false };
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM perfil_deportivo WHERE usuario_id = $1`,
    [contexto.usuarioId],
  );
  const perfilId = rows[0]?.id;
  if (!perfilId) return { roles: [], perfilId: null, solicitudPendiente: false };

  // Las dos lecturas pasan por `permisos.ts`: las tablas de vínculo no
  // se consultan desde un servicio (`11`, T4).
  const [roles, solicitudPendiente] = await Promise.all([
    obtenerRolesEnEquipo(perfilId, datos.equipoId),
    tieneSolicitudDeIngresoPendiente(perfilId, datos.equipoId),
  ]);

  return { roles, perfilId, solicitudPendiente };
};
