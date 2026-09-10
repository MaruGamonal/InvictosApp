import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-28 — Datos para la pantalla de "Dar de baja del torneo": nombre
 * del torneo y del equipo, y si el torneo ya está en curso (para
 * mostrar de entrada el aviso de que los partidos pendientes se dan
 * por ganados al rival, en vez de que la persona lo descubra recién al
 * confirmar). Solo para el Capitán del equipo (`darDeBajaDelTorneo`
 * resuelve `withdrawn` únicamente sobre esa base).
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid(), equipoId: z.string().uuid() });
export type ObtenerResumenBajaDelTorneoInput = z.infer<typeof esquemaEntrada>;

export interface ResumenBajaDelTorneo {
  torneoNombre: string;
  torneoEstado: string;
  equipoNombre: string;
  inscripcionEstado: string;
}

export const obtenerResumenBajaDelTorneo: Servicio<
  ObtenerResumenBajaDelTorneoInput,
  ResumenBajaDelTorneo
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilId, datos.equipoId, 'accion_de_capitan');

  const { rows } = await pool.query<{
    torneo_nombre: string;
    torneo_estado: string;
    equipo_nombre: string;
    inscripcion_estado: string;
  }>(
    `SELECT t.nombre AS torneo_nombre, t.estado AS torneo_estado, e.nombre AS equipo_nombre,
            i.estado AS inscripcion_estado
     FROM inscripcion i
     JOIN torneo t ON t.id = i.torneo_id
     JOIN equipo e ON e.id = i.equipo_id
     WHERE i.torneo_id = $1 AND i.equipo_id = $2`,
    [datos.torneoId, datos.equipoId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  return {
    torneoNombre: fila.torneo_nombre,
    torneoEstado: fila.torneo_estado,
    equipoNombre: fila.equipo_nombre,
    inscripcionEstado: fila.inscripcion_estado,
  };
};
