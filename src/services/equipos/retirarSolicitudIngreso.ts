import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-53 — Retirar una solicitud de ingreso propia, mientras esté
 * pendiente. Queda en `cancelled`: quien propuso —acá, la persona— se
 * echó atrás.
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type RetirarSolicitudIngresoInput = z.infer<typeof esquemaEntrada>;

export const retirarSolicitudIngreso: Servicio<
  RetirarSolicitudIngresoInput,
  { estado: 'cancelled' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) throw crearError('NO_ENCONTRADO');

  const { rowCount } = await pool.query(
    `UPDATE integrante_equipo SET estado_vinculo = 'cancelled', fecha_baja = now()
     WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = 'player' AND estado_vinculo = 'requested'`,
    [datos.equipoId, perfilId],
  );
  if (!rowCount) throw crearError('NO_ENCONTRADO');

  return { estado: 'cancelled' };
};
