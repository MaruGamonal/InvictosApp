import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-15 — Archivar un equipo: baja lógica, exclusiva del Capitán.
 * Bloqueada mientras el equipo compite en un torneo **en curso**
 * (`06`, D-68) — `torneo.estado = 'in_progress'`, la etiqueta "En
 * curso" de `04`: primero hay que resolverlo como baja del torneo
 * (T17).
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ArchivarEquipoInput = z.infer<typeof esquemaEntrada>;

export const archivarEquipo: Servicio<ArchivarEquipoInput, { id: string }> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilId, datos.equipoId, 'accion_de_capitan');

  const { rows: enCurso } = await pool.query(
    `SELECT 1 FROM inscripcion i
     JOIN torneo t ON t.id = i.torneo_id
     WHERE i.equipo_id = $1 AND i.estado = 'approved' AND t.estado = 'in_progress'`,
    [datos.equipoId],
  );
  if (enCurso.length > 0) throw crearError('EQUIPO_EN_TORNEO_EN_CURSO');

  const { rowCount } = await pool.query(
    `UPDATE equipo SET estado = 'archived' WHERE id = $1 AND estado = 'active'`,
    [datos.equipoId],
  );
  if (rowCount === 0) throw crearError('NO_ENCONTRADO');

  return { id: datos.equipoId };
};
