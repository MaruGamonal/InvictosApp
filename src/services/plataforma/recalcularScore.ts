import { obtenerPool } from '@/db/cliente';
import { invalidarCacheEquipo } from '@/lib/cache';

/**
 * T26, `10` 6.3 — El score deportivo (`06`, 5.4; `07`, sección 5) mide
 * desempeño reciente, no historia acumulada: cuenta results,
 * diferencia de gol, torneos disputados y posición final por torneo,
 * todo dentro de una ventana de `VENTANA_MESES` y con **decaimiento
 * lineal por antigüedad** — un resultado de hace 23 meses pesa casi
 * nada, uno de ayer pesa entero. Por eso el score puede bajar sin que
 * el equipo haya perdido nada nuevo: simplemente sus resultados viejos
 * van perdiendo peso.
 *
 * **`VERSION_FORMULA` es intencionalmente "provisional"**: las
 * ponderaciones de acá son valores de arranque, no una fórmula cerrada
 * — se calibran con datos reales más adelante. Cuando cambien, esta es
 * la única función que hay que tocar (el punto de entrada agendado por
 * T28 no cambia) y `version_formula` en `score_equipo` deja rastro de
 * qué fórmula produjo cada valor guardado.
 *
 * Los seguidores no entran en ningún componente — el score es
 * desempeño, no popularidad (mismo criterio que el resto del catálogo,
 * `06`).
 */

const VERSION_FORMULA = 'v1-provisional';
const VENTANA_MESES = 24;
const MESES_A_MS = 1000 * 60 * 60 * 24 * 30.44;
const TOPE_TORNEOS_PARA_COMPONENTE = 6;
const TOPE_DIFERENCIA_GOL_BRUTA = 10;
const DIFERENCIA_COMPRIMIDA_MAXIMA = Math.sqrt(TOPE_DIFERENCIA_GOL_BRUTA);

export interface ResumenRecalculoScore {
  procesados: number;
  cambiados: number;
  fallidos: Array<{ equipoId: string; error: string }>;
}

interface FilaPartidoConfirmado {
  torneo_id: string;
  equipo_local_id: string;
  equipo_visitante_id: string;
  goles_local: number;
  goles_visitante: number;
  fecha_confirmacion_resultado: Date;
}

interface FilaPosicionTorneo {
  torneo_id: string;
  grupo_id: string;
  equipo_id: string;
  puntos: number;
  ajuste_puntos: number;
  diferencia_gol: number;
  goles_favor: number;
}

/** Decae linealmente a 0 en `VENTANA_MESES`; nunca negativo. */
function calcularPesoPorAntiguedad(fecha: Date): number {
  const meses = (Date.now() - fecha.getTime()) / MESES_A_MS;
  return Math.max(0, 1 - meses / VENTANA_MESES);
}

/** Diferencia de gol "acotada, no lineal": cae la del partido a un tope, y comprime con raíz cuadrada. */
function comprimirDiferenciaDeGol(diferencia: number): number {
  const acotada = Math.max(-TOPE_DIFERENCIA_GOL_BRUTA, Math.min(TOPE_DIFERENCIA_GOL_BRUTA, diferencia));
  return Math.sign(acotada) * Math.sqrt(Math.abs(acotada));
}

/** Posición final normalizada (1 = primero, 0 = último) según el mismo desempate base que la tabla pública. */
function calcularBonusDePosicion(
  filas: FilaPosicionTorneo[],
  grupoId: string,
  equipoId: string,
): number | null {
  const delGrupo = filas.filter((f) => f.grupo_id === grupoId);
  if (delGrupo.length === 0) return null;

  const ordenadas = [...delGrupo].sort((a, b) => {
    const puntosA = a.puntos + a.ajuste_puntos;
    const puntosB = b.puntos + b.ajuste_puntos;
    if (puntosB !== puntosA) return puntosB - puntosA;
    if (b.diferencia_gol !== a.diferencia_gol) return b.diferencia_gol - a.diferencia_gol;
    return b.goles_favor - a.goles_favor;
  });
  const posicion = ordenadas.findIndex((f) => f.equipo_id === equipoId);
  if (posicion === -1) return null;
  if (ordenadas.length === 1) return 1;

  return 1 - posicion / (ordenadas.length - 1);
}

async function recalcularScoreDeUnEquipo(
  pool: ReturnType<typeof obtenerPool>,
  equipoId: string,
): Promise<void> {
  const { rows: partidos } = await pool.query<FilaPartidoConfirmado>(
    `SELECT p.torneo_id, p.equipo_local_id, p.equipo_visitante_id, p.goles_local, p.goles_visitante,
            p.fecha_confirmacion_resultado
     FROM partido p
     WHERE (p.equipo_local_id = $1 OR p.equipo_visitante_id = $1)
       AND p.estado_resultado = 'confirmed'
       AND p.fecha_confirmacion_resultado > now() - interval '24 months'`,
    [equipoId],
  );

  if (partidos.length === 0) {
    const { rows: historia } = await pool.query(
      `SELECT 1 FROM partido
       WHERE (equipo_local_id = $1 OR equipo_visitante_id = $1) AND estado_resultado = 'confirmed'
       LIMIT 1`,
      [equipoId],
    );
    await pool.query(
      `INSERT INTO score_equipo (equipo_id, valor, desglose_componentes, version_formula, partidos_computados, estado, ultima_actualizacion)
       VALUES ($1, NULL, NULL, $2, 0, $3, now())
       ON CONFLICT (equipo_id) DO UPDATE
       SET valor = NULL, desglose_componentes = NULL, version_formula = $2, partidos_computados = 0,
           estado = $3, ultima_actualizacion = now()`,
      [equipoId, VERSION_FORMULA, historia.length > 0 ? 'stale' : 'insufficient_activity'],
    );
    invalidarCacheEquipo(equipoId);
    return;
  }

  let ganados = 0;
  let empatados = 0;
  let perdidos = 0;
  let sumaPuntosPonderados = 0;
  let sumaDiferenciaPonderada = 0;
  const torneosJugados = new Set<string>();

  for (const partido of partidos) {
    const esLocal = partido.equipo_local_id === equipoId;
    const golesPropios = esLocal ? partido.goles_local : partido.goles_visitante;
    const golesRival = esLocal ? partido.goles_visitante : partido.goles_local;
    const diferencia = golesPropios - golesRival;
    const peso = calcularPesoPorAntiguedad(partido.fecha_confirmacion_resultado);

    let puntosPartido: number;
    if (diferencia > 0) {
      ganados += 1;
      puntosPartido = 3;
    } else if (diferencia === 0) {
      empatados += 1;
      puntosPartido = 1;
    } else {
      perdidos += 1;
      puntosPartido = 0;
    }

    sumaPuntosPonderados += puntosPartido * peso;
    sumaDiferenciaPonderada += comprimirDiferenciaDeGol(diferencia) * peso;
    torneosJugados.add(partido.torneo_id);
  }

  const n = partidos.length;
  const promedioPuntos = sumaPuntosPonderados / n;
  const promedioDiferencia = sumaDiferenciaPonderada / n;

  const { rows: posiciones } = await pool.query<FilaPosicionTorneo>(
    `SELECT i.torneo_id, i.grupo_id, pos.equipo_id, pos.puntos, pos.ajuste_puntos, pos.diferencia_gol, pos.goles_favor
     FROM inscripcion i
     JOIN torneo t ON t.id = i.torneo_id
     JOIN posicion pos ON pos.grupo_id = i.grupo_id
     WHERE i.torneo_id = ANY($1::uuid[]) AND t.estado = 'finished' AND i.grupo_id IS NOT NULL`,
    [[...torneosJugados]],
  );

  const bonusPorTorneo: number[] = [];
  for (const torneoId of torneosJugados) {
    const propia = posiciones.find((p) => p.torneo_id === torneoId && p.equipo_id === equipoId);
    if (!propia) continue;
    const bonus = calcularBonusDePosicion(posiciones, propia.grupo_id, equipoId);
    if (bonus !== null) bonusPorTorneo.push(bonus);
  }
  const bonusPosicionPromedio =
    bonusPorTorneo.length > 0 ? bonusPorTorneo.reduce((a, b) => a + b, 0) / bonusPorTorneo.length : 0;

  const componenteResultados = 50 * (promedioPuntos / 3);
  const componenteDiferencia =
    20 * ((promedioDiferencia + DIFERENCIA_COMPRIMIDA_MAXIMA) / (2 * DIFERENCIA_COMPRIMIDA_MAXIMA));
  const componenteTorneos = 15 * Math.min(torneosJugados.size / TOPE_TORNEOS_PARA_COMPONENTE, 1);
  const componentePosicion = 15 * bonusPosicionPromedio;

  const valor = Math.round(
    Math.max(
      0,
      Math.min(100, componenteResultados + componenteDiferencia + componenteTorneos + componentePosicion),
    ),
  );

  const desglose = {
    ventanaMeses: VENTANA_MESES,
    partidosGanados: ganados,
    partidosEmpatados: empatados,
    partidosPerdidos: perdidos,
    promedioPuntos: Number(promedioPuntos.toFixed(2)),
    componenteResultados: Number(componenteResultados.toFixed(1)),
    promedioDiferenciaGol: Number(promedioDiferencia.toFixed(2)),
    componenteDiferenciaGol: Number(componenteDiferencia.toFixed(1)),
    torneosDisputados: torneosJugados.size,
    componenteTorneos: Number(componenteTorneos.toFixed(1)),
    bonusPosicionPromedio: Number(bonusPosicionPromedio.toFixed(2)),
    componentePosicion: Number(componentePosicion.toFixed(1)),
  };

  await pool.query(
    `INSERT INTO score_equipo (equipo_id, valor, desglose_componentes, version_formula, partidos_computados, estado, ultima_actualizacion)
     VALUES ($1, $2, $3, $4, $5, 'active', now())
     ON CONFLICT (equipo_id) DO UPDATE
     SET valor = $2, desglose_componentes = $3, version_formula = $4, partidos_computados = $5,
         estado = 'active', ultima_actualizacion = now()`,
    [equipoId, valor, JSON.stringify(desglose), VERSION_FORMULA, n],
  );
  invalidarCacheEquipo(equipoId);
}

export async function recalcularScore(): Promise<ResumenRecalculoScore> {
  const pool = obtenerPool();
  const resumen: ResumenRecalculoScore = { procesados: 0, cambiados: 0, fallidos: [] };

  const { rows: equipos } = await pool.query<{ id: string }>(
    `SELECT id FROM equipo WHERE estado = 'active'`,
  );

  for (const { id: equipoId } of equipos) {
    resumen.procesados += 1;
    try {
      await recalcularScoreDeUnEquipo(pool, equipoId);
      resumen.cambiados += 1;
    } catch (error) {
      resumen.fallidos.push({
        equipoId,
        error: error instanceof Error ? error.message : 'ERROR_INTERNO',
      });
    }
  }

  console.log('[tarea:recalcularScore]', JSON.stringify(resumen));
  return resumen;
}
