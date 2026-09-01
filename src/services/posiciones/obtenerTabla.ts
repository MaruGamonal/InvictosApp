import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-35 — Tabla de posiciones, pública y sin sesión (`10`, 4.8). Lee el
 * valor guardado por `cargarResultado`, nunca lo recalcula (`10`, 7.1).
 *
 * Orden: `puntos + ajuste_puntos` DESC y después los criterios de
 * desempate configurados del torneo, en su orden (`torneo.criterios_desempate`,
 * default `goal_difference → goals_for → head_to_head`). Los dos
 * primeros salen directo del índice `posicion (grupo_id, puntos DESC,
 * diferencia_gol DESC, goles_favor DESC)` (`11`, T15); `head_to_head`
 * solo entra a jugar dentro de un grupo de equipos que sigue empatado
 * después de los dos anteriores, y se resuelve con los puntos que esos
 * equipos sacaron **entre sí** en los partidos ya jugados de ese grupo.
 *
 * `provisorio` marca si hay algún resultado `disputed` en el grupo —
 * sigue computando (`06`, D-95) pero avisa que puede cambiar. Con T15
 * solo, ningún partido llega a `disputed` todavía (eso es T29); el campo
 * ya se calcula bien para cuando exista.
 */

const esquemaEntrada = z
  .object({
    faseId: z.string().uuid().optional(),
    grupoId: z.string().uuid().optional(),
  })
  .refine((d) => Boolean(d.faseId) !== Boolean(d.grupoId), {
    message: 'Hay que indicar una fase o un grupo puntual, no los dos ni ninguno.',
  });
export type ObtenerTablaInput = z.infer<typeof esquemaEntrada>;

export interface FilaTabla {
  equipoId: string;
  equipoNombre: string;
  equipoEscudoUrl: string | null;
  puntos: number;
  ajustePuntos: number;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGol: number;
}

export interface TablaDeGrupo {
  grupoId: string;
  nombre: string;
  provisorio: boolean;
  filas: FilaTabla[];
}

type CriterioDesempate = 'goal_difference' | 'goals_for' | 'head_to_head';

interface FilaPosicionCruda {
  equipo_id: string;
  equipo_nombre: string;
  equipo_escudo_url: string | null;
  puntos: number;
  ajuste_puntos: number;
  partidos_jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_gol: number;
}

function aFila(fila: FilaPosicionCruda): FilaTabla {
  return {
    equipoId: fila.equipo_id,
    equipoNombre: fila.equipo_nombre,
    equipoEscudoUrl: fila.equipo_escudo_url,
    puntos: fila.puntos,
    ajustePuntos: fila.ajuste_puntos,
    partidosJugados: fila.partidos_jugados,
    ganados: fila.ganados,
    empatados: fila.empatados,
    perdidos: fila.perdidos,
    golesFavor: fila.goles_favor,
    golesContra: fila.goles_contra,
    diferenciaGol: fila.diferencia_gol,
  };
}

/** Agrupa filas consecutivas ya ordenadas por puntos+ajuste y diferencia_gol/goles_favor que siguen empatadas en las tres. */
function agruparEmpates(filas: FilaTabla[]): FilaTabla[][] {
  const grupos: FilaTabla[][] = [];
  for (const fila of filas) {
    const anterior = grupos[grupos.length - 1];
    const clave = (f: FilaTabla) =>
      `${f.puntos + f.ajustePuntos}|${f.diferenciaGol}|${f.golesFavor}`;
    if (anterior && clave(anterior[0]!) === clave(fila)) {
      anterior.push(fila);
    } else {
      grupos.push([fila]);
    }
  }
  return grupos;
}

async function desempatarPorEnfrentamientoDirecto(
  grupoId: string,
  empatados: FilaTabla[],
  puntajes: { puntosVictoria: number; puntosEmpate: number; puntosDerrota: number },
): Promise<FilaTabla[]> {
  const pool = obtenerPool();
  const equipoIds = empatados.map((f) => f.equipoId);
  const { rows: partidos } = await pool.query<{
    equipo_local_id: string;
    equipo_visitante_id: string;
    goles_local: number;
    goles_visitante: number;
  }>(
    `SELECT equipo_local_id, equipo_visitante_id, goles_local, goles_visitante
     FROM partido
     WHERE grupo_id = $1 AND estado = 'played'
       AND equipo_local_id = ANY($2) AND equipo_visitante_id = ANY($2)`,
    [grupoId, equipoIds],
  );

  const puntosEntreSi = new Map<string, number>(equipoIds.map((id) => [id, 0]));
  for (const p of partidos) {
    if (p.goles_local > p.goles_visitante) {
      puntosEntreSi.set(
        p.equipo_local_id,
        (puntosEntreSi.get(p.equipo_local_id) ?? 0) + puntajes.puntosVictoria,
      );
      puntosEntreSi.set(
        p.equipo_visitante_id,
        (puntosEntreSi.get(p.equipo_visitante_id) ?? 0) + puntajes.puntosDerrota,
      );
    } else if (p.goles_local < p.goles_visitante) {
      puntosEntreSi.set(
        p.equipo_visitante_id,
        (puntosEntreSi.get(p.equipo_visitante_id) ?? 0) + puntajes.puntosVictoria,
      );
      puntosEntreSi.set(
        p.equipo_local_id,
        (puntosEntreSi.get(p.equipo_local_id) ?? 0) + puntajes.puntosDerrota,
      );
    } else {
      puntosEntreSi.set(
        p.equipo_local_id,
        (puntosEntreSi.get(p.equipo_local_id) ?? 0) + puntajes.puntosEmpate,
      );
      puntosEntreSi.set(
        p.equipo_visitante_id,
        (puntosEntreSi.get(p.equipo_visitante_id) ?? 0) + puntajes.puntosEmpate,
      );
    }
  }

  return [...empatados].sort(
    (a, b) => (puntosEntreSi.get(b.equipoId) ?? 0) - (puntosEntreSi.get(a.equipoId) ?? 0),
  );
}

async function construirTablaDeGrupo(
  grupo: { id: string; nombre: string },
  torneo: {
    criterios_desempate: CriterioDesempate[];
    puntos_victoria: number;
    puntos_empate: number;
    puntos_derrota: number;
  },
): Promise<TablaDeGrupo> {
  const pool = obtenerPool();
  const { rows } = await pool.query<FilaPosicionCruda>(
    `SELECT p.equipo_id, e.nombre AS equipo_nombre, e.escudo_url AS equipo_escudo_url,
            p.puntos, p.ajuste_puntos, p.partidos_jugados, p.ganados, p.empatados, p.perdidos,
            p.goles_favor, p.goles_contra, p.diferencia_gol
     FROM posicion p
     JOIN equipo e ON e.id = p.equipo_id
     WHERE p.grupo_id = $1
     ORDER BY (p.puntos + p.ajuste_puntos) DESC, p.diferencia_gol DESC, p.goles_favor DESC`,
    [grupo.id],
  );
  let filas = rows.map(aFila);

  if (torneo.criterios_desempate.includes('head_to_head')) {
    const gruposEmpatados = agruparEmpates(filas);
    const resultado: FilaTabla[] = [];
    for (const empatados of gruposEmpatados) {
      if (empatados.length < 2) {
        resultado.push(...empatados);
        continue;
      }
      resultado.push(
        ...(await desempatarPorEnfrentamientoDirecto(grupo.id, empatados, {
          puntosVictoria: torneo.puntos_victoria,
          puntosEmpate: torneo.puntos_empate,
          puntosDerrota: torneo.puntos_derrota,
        })),
      );
    }
    filas = resultado;
  }

  const { rows: disputados } = await pool.query(
    `SELECT 1 FROM partido WHERE grupo_id = $1 AND estado_resultado = 'disputed' LIMIT 1`,
    [grupo.id],
  );

  return { grupoId: grupo.id, nombre: grupo.nombre, provisorio: disputados.length > 0, filas };
}

export const obtenerTabla: Servicio<ObtenerTablaInput, TablaDeGrupo[]> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  let grupos: { id: string; nombre: string; torneo_id: string }[];
  if (datos.grupoId) {
    const { rows } = await pool.query<{ id: string; nombre: string; torneo_id: string }>(
      'SELECT g.id, g.nombre, f.torneo_id FROM grupo g JOIN fase f ON f.id = g.fase_id WHERE g.id = $1',
      [datos.grupoId],
    );
    grupos = rows;
  } else {
    const { rows } = await pool.query<{ id: string; nombre: string; torneo_id: string }>(
      'SELECT g.id, g.nombre, f.torneo_id FROM grupo g JOIN fase f ON f.id = g.fase_id WHERE f.id = $1 ORDER BY g.nombre ASC',
      [datos.faseId],
    );
    grupos = rows;
  }
  if (grupos.length === 0) throw crearError('NO_ENCONTRADO');

  const { rows: torneoRows } = await pool.query<{
    criterios_desempate: CriterioDesempate[];
    puntos_victoria: number;
    puntos_empate: number;
    puntos_derrota: number;
  }>(
    'SELECT criterios_desempate, puntos_victoria, puntos_empate, puntos_derrota FROM torneo WHERE id = $1',
    [grupos[0]!.torneo_id],
  );
  const torneo = torneoRows[0]!;

  return Promise.all(grupos.map((grupo) => construirTablaDeGrupo(grupo, torneo)));
};
