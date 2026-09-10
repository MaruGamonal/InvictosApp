import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { listarEquiposGestionablesPorPerfil } from '@/lib/permisos';

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerMiInscripcionEnTorneoInput = z.infer<typeof esquemaEntrada>;

export interface MiInscripcionTorneo {
  equipoId: string;
  equipoNombre: string;
  estado: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'excluded' | 'waitlisted';
  advertenciaCategoria: boolean;
}

/**
 * ¿Ya inscribí a alguno de mis equipos en este torneo? Sin sesión o sin
 * equipos gestionables, `[]` — no es un error, es la respuesta correcta
 * para alguien que solo está mirando la ficha (D-04b). Alimenta a
 * `BotonInscribirEquipo`: la ficha del torneo es pública y cacheada por
 * evento, así que no puede nacer sabiendo si la solicitud ya se mandó
 * — reportado en vivo: volver a la ficha después de inscribirse volvía
 * a ofrecer "Inscribir a mi equipo" como si nada.
 */
export const obtenerMiInscripcionEnTorneo: Servicio<
  ObtenerMiInscripcionEnTorneoInput,
  MiInscripcionTorneo[]
> = async (input, contexto) => {
  if (!contexto.usuarioId) return [];
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) return [];

  const equipoIds = await listarEquiposGestionablesPorPerfil(perfilId);
  if (equipoIds.length === 0) return [];

  const { rows } = await pool.query<{
    equipo_id: string;
    equipo_nombre: string;
    estado: MiInscripcionTorneo['estado'];
    advertencia_categoria: boolean;
  }>(
    `SELECT i.equipo_id, e.nombre AS equipo_nombre, i.estado, i.advertencia_categoria
     FROM inscripcion i
     JOIN equipo e ON e.id = i.equipo_id
     WHERE i.torneo_id = $1 AND i.equipo_id = ANY($2)`,
    [datos.torneoId, equipoIds],
  );

  return rows.map((fila) => ({
    equipoId: fila.equipo_id,
    equipoNombre: fila.equipo_nombre,
    estado: fila.estado,
    advertenciaCategoria: fila.advertencia_categoria,
  }));
};
