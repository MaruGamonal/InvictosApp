import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/** UC-46 — Marcar una notificación propia como leída. */

const esquemaEntrada = z.object({ notificacionId: z.string().uuid() });
export type MarcarLeidaInput = z.infer<typeof esquemaEntrada>;

export const marcarLeida: Servicio<MarcarLeidaInput, { id: string }> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE notificacion SET estado = 'read' WHERE id = $1 AND usuario_id = $2 RETURNING id`,
    [datos.notificacionId, contexto.usuarioId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  return { id: fila.id };
};
