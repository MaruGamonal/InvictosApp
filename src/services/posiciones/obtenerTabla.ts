import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-35 — Tabla de posiciones, pública y sin sesión (`10`, 4.8). Lee el
 * valor guardado por `cargarResultado`, nunca lo recalcula (`10`, 7.1).
 *
 * **Parte de los equipos del grupo, no de las filas de `posicion`.**
 * `posicion` se escribe recién cuando llega el primer resultado de cada
 * equipo, así que un torneo recién arrancado no tenía ninguna fila y la
 * tabla aparecía vacía —con el fixture ya confirmado y los partidos a la
 * vista—. Quien entra espera ver a todos los equipos en cero, que es lo
 * que la tabla dice al empezar cualquier torneo. Los equipos salen de
 * `partido`, que es lo único que sabe quién juega en qué grupo: no hay
 * tabla de pertenencia, y en un formato de zonas la inscripción al
 * torneo no alcanza para saber a cuál fue cada equipo.
 *
 * Se resuelve leyendo, no escribiendo filas en cero al confirmar el
 * fixture: así vale también para los torneos que ya estaban en curso,
 * sin migración ni relleno.
 *
 * Orden: `puntos + ajuste_puntos` DESC y después los criterios de
 * desempate configurados del torneo, **en su orden**
 * (`torneo.criterios_desempate`, default
 * `goal_difference → goals_for → head_to_head`).
 *
 * Eso es lo que este comentario decía y lo que el código **no hacía**:
 * el `ORDER BY` tenía `diferencia_gol DESC, goles_favor DESC` fijo, y
 * de `criterios_desempate` sólo se miraba si contenía `head_to_head`.
 * O sea: cambiar el orden entre los dos primeros no hacía nada, sacar
 * uno de la lista tampoco, y `head_to_head` se aplicaba siempre último
 * aunque estuviera configurado primero. Se notó al construir la
 * pantalla que deja elegir ese orden: el formulario guardaba algo que
 * no tenía efecto.
 *
 * Ahora el orden se aplica criterio por criterio sobre los que siguen
 * empatados, en el orden configurado. El SQL ordena por puntos —que es
 * donde el índice `posicion (grupo_id, puntos DESC, …)` sirve— y el
 * resto se resuelve sobre los empatados, que en un grupo son unos
 * pocos. `head_to_head` se resuelve con los puntos que esos equipos
 * sacaron **entre sí** en los partidos ya jugados del grupo.
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
  /**
   * Cuántos de `ganados` son por presentación (`06`, D-33b: se distingue
   * de un triunfo en la cancha, en fixture y en tabla) — subconjunto de
   * `ganados`, no se suma aparte.
   */
  ganadosPorPresentacion: number;
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
  ganados_por_presentacion: string;
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
    ganadosPorPresentacion: Number(fila.ganados_por_presentacion ?? 0),
    empatados: fila.empatados,
    perdidos: fila.perdidos,
    golesFavor: fila.goles_favor,
    golesContra: fila.goles_contra,
    diferenciaGol: fila.diferencia_gol,
  };
}

/**
 * Agrupa filas consecutivas empatadas en puntos. Antes agrupaba también
 * por diferencia de gol y goles a favor, porque esos dos ya venían
 * aplicados desde el `ORDER BY` fijo: con el orden configurable, el
 * único empate que el SQL puede dar por resuelto es el de puntos.
 */
function agruparPorPuntos(filas: FilaTabla[]): FilaTabla[][] {
  const grupos: FilaTabla[][] = [];
  for (const fila of filas) {
    const anterior = grupos[grupos.length - 1];
    const clave = (f: FilaTabla) => f.puntos + f.ajustePuntos;
    if (anterior && clave(anterior[0]!) === clave(fila)) {
      anterior.push(fila);
    } else {
      grupos.push([fila]);
    }
  }
  return grupos;
}

/** Los puntos que los empatados sacaron **entre sí**, por equipo. */
async function desempatarPorEnfrentamientoDirecto(
  grupoId: string,
  empatados: FilaTabla[],
  puntajes: { puntosVictoria: number; puntosEmpate: number; puntosDerrota: number },
): Promise<Map<string, number>> {
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

  return puntosEntreSi;
}

/**
 * El valor comparable de cada equipo para un criterio: más alto, más
 * arriba. Unificar los tres en una sola forma es lo que deja aplicarlos
 * en cualquier orden sin un `if` por combinación.
 */
async function valoresDelCriterio(
  criterio: CriterioDesempate,
  grupoId: string,
  empatados: FilaTabla[],
  puntajes: { puntosVictoria: number; puntosEmpate: number; puntosDerrota: number },
): Promise<Map<string, number>> {
  if (criterio === 'head_to_head') {
    return desempatarPorEnfrentamientoDirecto(grupoId, empatados, puntajes);
  }
  const de = criterio === 'goal_difference' ? 'diferenciaGol' : 'golesFavor';
  return new Map(empatados.map((fila) => [fila.equipoId, fila[de]]));
}

/** Los que quedan con el mismo valor siguen empatados y pasan al criterio siguiente. */
function agruparPorValor(filas: FilaTabla[], valor: Map<string, number>): FilaTabla[][] {
  const grupos: FilaTabla[][] = [];
  for (const fila of filas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && valor.get(ultimo[0]!.equipoId) === valor.get(fila.equipoId)) {
      ultimo.push(fila);
    } else {
      grupos.push([fila]);
    }
  }
  return grupos;
}

/**
 * Aplica los criterios configurados, en orden, a un conjunto que ya
 * está empatado en puntos. Cada criterio ordena y vuelve a agrupar: los
 * que siguen iguales pasan al siguiente. Agotados los criterios, el
 * nombre decide — no para ser justo, sino para que la tabla no cambie
 * de orden sola entre dos lecturas.
 */
async function ordenarPorCriterios(
  grupoId: string,
  empatados: FilaTabla[],
  criterios: CriterioDesempate[],
  puntajes: { puntosVictoria: number; puntosEmpate: number; puntosDerrota: number },
): Promise<FilaTabla[]> {
  if (empatados.length < 2) return empatados;
  const [criterio, ...resto] = criterios;
  if (!criterio) {
    return [...empatados].sort((a, b) => a.equipoNombre.localeCompare(b.equipoNombre, 'es'));
  }

  const valor = await valoresDelCriterio(criterio, grupoId, empatados, puntajes);
  const ordenadas = [...empatados].sort(
    (a, b) => (valor.get(b.equipoId) ?? 0) - (valor.get(a.equipoId) ?? 0),
  );

  const salida: FilaTabla[] = [];
  for (const subgrupo of agruparPorValor(ordenadas, valor)) {
    salida.push(...(await ordenarPorCriterios(grupoId, subgrupo, resto, puntajes)));
  }
  return salida;
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
    `WITH equipos_del_grupo AS (
       SELECT equipo_local_id AS equipo_id FROM partido WHERE grupo_id = $1
       UNION
       SELECT equipo_visitante_id FROM partido WHERE grupo_id = $1
     )
     SELECT eg.equipo_id, e.nombre AS equipo_nombre, e.escudo_url AS equipo_escudo_url,
            coalesce(p.puntos, 0) AS puntos,
            coalesce(p.ajuste_puntos, 0) AS ajuste_puntos,
            coalesce(p.partidos_jugados, 0) AS partidos_jugados,
            coalesce(p.ganados, 0) AS ganados,
            coalesce(p.empatados, 0) AS empatados,
            coalesce(p.perdidos, 0) AS perdidos,
            coalesce(p.goles_favor, 0) AS goles_favor,
            coalesce(p.goles_contra, 0) AS goles_contra,
            coalesce(p.diferencia_gol, 0) AS diferencia_gol,
            -- El parámetro y no p.grupo_id: con el LEFT JOIN, un equipo
            -- sin fila en posicion traería grupo_id nulo y el conteo
            -- daría cero aunque hubiera ganado por presentación.
            (SELECT count(*) FROM partido pw
             WHERE pw.grupo_id = $1 AND pw.estado = 'walkover'
               AND ((pw.equipo_local_id = eg.equipo_id AND pw.goles_local > pw.goles_visitante)
                 OR (pw.equipo_visitante_id = eg.equipo_id AND pw.goles_visitante > pw.goles_local))
            ) AS ganados_por_presentacion
     FROM equipos_del_grupo eg
     JOIN equipo e ON e.id = eg.equipo_id
     LEFT JOIN posicion p ON p.grupo_id = $1 AND p.equipo_id = eg.equipo_id
     -- Sólo por puntos: el desempate lo deciden los criterios
     -- configurados, en su orden, y hacerlo acá los dejaría fijos. El
     -- nombre va de último para que dos lecturas seguidas devuelvan
     -- siempre lo mismo antes de desempatar.
     ORDER BY (coalesce(p.puntos, 0) + coalesce(p.ajuste_puntos, 0)) DESC,
              e.nombre ASC`,
    [grupo.id],
  );
  const puntajes = {
    puntosVictoria: torneo.puntos_victoria,
    puntosEmpate: torneo.puntos_empate,
    puntosDerrota: torneo.puntos_derrota,
  };
  const filas: FilaTabla[] = [];
  for (const empatados of agruparPorPuntos(rows.map(aFila))) {
    filas.push(
      ...(await ordenarPorCriterios(grupo.id, empatados, torneo.criterios_desempate, puntajes)),
    );
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
