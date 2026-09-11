import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * Ranking por ciudad, modalidad y categoría del equipo — **no existe un
 * ranking global** (`06`, 5.4): comparar un F5 de una ciudad con un F11
 * de otra, o un torneo masculino con uno femenino, no significa nada.
 * Los tres filtros se leen del propio equipo (`ciudad_id`,
 * `modalidad_habitual`, `categoria_genero`), no de los torneos que
 * jugó — un equipo puede haber jugado torneos en otra ciudad y eso no
 * cambia contra quién se lo compara acá.
 *
 * Solo entran equipos con `score_equipo.estado = 'active'`: sin
 * actividad reciente suficiente, ni entran al ranking ni lo bajan
 * (`06`, S-04) — la ausencia no es lo mismo que un puntaje bajo.
 */

const esquemaEntrada = z.object({ equipoId: z.string().uuid() });
export type ObtenerRankingInput = z.infer<typeof esquemaEntrada>;

export interface EquipoRankeado {
  equipoId: string;
  nombre: string;
  escudoUrl: string | null;
  valor: number;
  esElEquipoActual: boolean;
}

export type RankingResultado =
  | {
      disponible: true;
      ciudadNombre: string;
      modalidad: 'f5' | 'f7' | 'f8' | 'f9' | 'f11';
      categoriaGenero: 'male' | 'female' | 'mixed';
      equipos: EquipoRankeado[];
    }
  | { disponible: false };

const LIMITE = 50;

export const obtenerRanking: Servicio<ObtenerRankingInput, RankingResultado> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows: equipoRows } = await pool.query<{
    ciudad_id: string | null;
    ciudad_nombre: string | null;
    modalidad_habitual: 'f5' | 'f7' | 'f8' | 'f9' | 'f11' | null;
    categoria_genero: 'male' | 'female' | 'mixed';
  }>(
    `SELECT e.ciudad_id, c.nombre AS ciudad_nombre, e.modalidad_habitual, e.categoria_genero
     FROM equipo e LEFT JOIN ciudad c ON c.id = e.ciudad_id
     WHERE e.id = $1`,
    [datos.equipoId],
  );
  const equipo = equipoRows[0];
  if (!equipo) throw crearError('NO_ENCONTRADO');

  if (!equipo.ciudad_id || !equipo.modalidad_habitual) {
    return { disponible: false };
  }

  const { rows } = await pool.query<{
    id: string;
    nombre: string;
    escudo_url: string | null;
    valor: string;
  }>(
    `SELECT e.id, e.nombre, e.escudo_url, se.valor
     FROM equipo e
     JOIN score_equipo se ON se.equipo_id = e.id
     WHERE e.estado = 'active' AND se.estado = 'active'
       AND e.ciudad_id = $1 AND e.modalidad_habitual = $2 AND e.categoria_genero = $3
     ORDER BY se.valor DESC
     LIMIT $4`,
    [equipo.ciudad_id, equipo.modalidad_habitual, equipo.categoria_genero, LIMITE],
  );

  return {
    disponible: true,
    ciudadNombre: equipo.ciudad_nombre!,
    modalidad: equipo.modalidad_habitual,
    categoriaGenero: equipo.categoria_genero,
    equipos: rows.map((fila) => ({
      equipoId: fila.id,
      nombre: fila.nombre,
      escudoUrl: fila.escudo_url,
      valor: Number(fila.valor),
      esElEquipoActual: fila.id === datos.equipoId,
    })),
  };
};
