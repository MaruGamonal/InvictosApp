import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-11 — Cancelar una invitación pendiente, por Capitán o Delegado.
 * Las invitaciones no vencen (`06`, D-57): esta es la única forma de
 * darlas de baja, y queda en `cancelled` — distinto de `declined`,
 * porque acá quien se echó atrás fue el equipo, no la persona invitada.
 */

const esquemaEntrada = z.object({
  equipoId: z.string().uuid(),
  perfilId: z.string().uuid(),
  rol: z.enum(['player', 'delegate', 'coach']),
});
export type CancelarInvitacionInput = z.infer<typeof esquemaEntrada>;

export const cancelarInvitacion: Servicio<
  CancelarInvitacionInput,
  { estado: 'cancelled' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilPropioId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilPropioId, datos.equipoId, 'gestionar_plantel');

  const { rowCount } = await pool.query(
    `UPDATE integrante_equipo SET estado_vinculo = 'cancelled', fecha_baja = now()
     WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = $3 AND estado_vinculo = 'invited'`,
    [datos.equipoId, datos.perfilId, datos.rol],
  );
  if (!rowCount) throw crearError('NO_ENCONTRADO');

  return { estado: 'cancelled' };
};
