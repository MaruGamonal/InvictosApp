import type { PoolClient } from 'pg';

/**
 * Recalcula `posicion` de los dos equipos de un partido dentro de la
 * transacción de `cargarResultado` (T15) — nunca la tabla entera (`10`,
 * 7.1): **es una diferencia, no una suma que se rehace**. Si el partido
 * ya tenía un resultado cargado (`golesLocalAnterior`/`golesVisitanteAnterior`
 * no nulos), se resta su efecto antes de sumar el nuevo, en el mismo
 * `UPDATE` — así "corregir" nunca deja `partidos_jugados` de más y queda
 * expresado como lo que es: un ajuste, no dos operaciones separadas.
 */

export interface PuntajesTorneo {
  puntosVictoria: number;
  puntosEmpate: number;
  puntosDerrota: number;
}

interface EfectoEquipo {
  puntos: number;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGol: number;
}

function calcularEfecto(
  golesPropios: number,
  golesRivales: number,
  puntajes: PuntajesTorneo,
): EfectoEquipo {
  const base = {
    partidosJugados: 1,
    golesFavor: golesPropios,
    golesContra: golesRivales,
    diferenciaGol: golesPropios - golesRivales,
  };
  if (golesPropios > golesRivales) {
    return { ...base, puntos: puntajes.puntosVictoria, ganados: 1, empatados: 0, perdidos: 0 };
  }
  if (golesPropios < golesRivales) {
    return { ...base, puntos: puntajes.puntosDerrota, ganados: 0, empatados: 0, perdidos: 1 };
  }
  return { ...base, puntos: puntajes.puntosEmpate, ganados: 0, empatados: 1, perdidos: 0 };
}

function restar(a: EfectoEquipo, b: EfectoEquipo): EfectoEquipo {
  return {
    puntos: a.puntos - b.puntos,
    partidosJugados: a.partidosJugados - b.partidosJugados,
    ganados: a.ganados - b.ganados,
    empatados: a.empatados - b.empatados,
    perdidos: a.perdidos - b.perdidos,
    golesFavor: a.golesFavor - b.golesFavor,
    golesContra: a.golesContra - b.golesContra,
    diferenciaGol: a.diferenciaGol - b.diferenciaGol,
  };
}

async function aplicarDelta(
  cliente: PoolClient,
  grupoId: string,
  equipoId: string,
  delta: EfectoEquipo,
): Promise<void> {
  await cliente.query(
    `INSERT INTO posicion (grupo_id, equipo_id, puntos, partidos_jugados, ganados, empatados, perdidos, goles_favor, goles_contra, diferencia_gol, ultima_actualizacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (grupo_id, equipo_id) DO UPDATE SET
       puntos = posicion.puntos + EXCLUDED.puntos,
       partidos_jugados = posicion.partidos_jugados + EXCLUDED.partidos_jugados,
       ganados = posicion.ganados + EXCLUDED.ganados,
       empatados = posicion.empatados + EXCLUDED.empatados,
       perdidos = posicion.perdidos + EXCLUDED.perdidos,
       goles_favor = posicion.goles_favor + EXCLUDED.goles_favor,
       goles_contra = posicion.goles_contra + EXCLUDED.goles_contra,
       diferencia_gol = posicion.diferencia_gol + EXCLUDED.diferencia_gol,
       ultima_actualizacion = now()`,
    [
      grupoId,
      equipoId,
      delta.puntos,
      delta.partidosJugados,
      delta.ganados,
      delta.empatados,
      delta.perdidos,
      delta.golesFavor,
      delta.golesContra,
      delta.diferenciaGol,
    ],
  );
}

export async function aplicarResultadoAPosicion(
  cliente: PoolClient,
  grupoId: string,
  equipoLocalId: string,
  equipoVisitanteId: string,
  golesLocal: number,
  golesVisitante: number,
  golesLocalAnterior: number | null,
  golesVisitanteAnterior: number | null,
  puntajes: PuntajesTorneo,
): Promise<void> {
  const nuevoLocal = calcularEfecto(golesLocal, golesVisitante, puntajes);
  const nuevoVisitante = calcularEfecto(golesVisitante, golesLocal, puntajes);

  let deltaLocal = nuevoLocal;
  let deltaVisitante = nuevoVisitante;
  if (golesLocalAnterior !== null && golesVisitanteAnterior !== null) {
    deltaLocal = restar(
      nuevoLocal,
      calcularEfecto(golesLocalAnterior, golesVisitanteAnterior, puntajes),
    );
    deltaVisitante = restar(
      nuevoVisitante,
      calcularEfecto(golesVisitanteAnterior, golesLocalAnterior, puntajes),
    );
  }

  await aplicarDelta(cliente, grupoId, equipoLocalId, deltaLocal);
  await aplicarDelta(cliente, grupoId, equipoVisitanteId, deltaVisitante);
}
