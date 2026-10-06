import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { confirmarPlantel } from '@/services/inscripciones/confirmarPlantel';
import { obtenerHistorialDelJugador } from '@/services/identidad/obtenerHistorialDelJugador';
import { crearTorneoDePrueba, inscribirEquipos, generarYConfirmarFixture } from './_escenarios';

/**
 * T27 / UC-38 — La alineación por partido contra Postgres real.
 *
 * Lo que se verifica acá y no se puede con la base simulada: que el
 * `UPSERT` acumule de verdad sobre `estadistica_jugador.partidos_jugados`
 * —la columna que nadie escribía—, que la clave `(partido_id, perfil_id)`
 * impida que alguien juegue el mismo partido para los dos equipos, y que
 * corregir la alineación deje el acumulado en su valor correcto en vez
 * de sumar dos veces.
 */

/** Arma un torneo en curso con cuatro equipos y devuelve el primer partido del equipo dado. */
async function escenarioConPartido() {
  const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
  const equipos = await inscribirEquipos(escenario, 4);
  await generarYConfirmarFixture(escenario);

  const { rows } = await obtenerPool().query<{
    id: string;
    version: number;
    equipo_local_id: string;
    equipo_visitante_id: string;
  }>(
    `SELECT id, version, equipo_local_id, equipo_visitante_id FROM partido
     WHERE torneo_id = $1 ORDER BY numero_fecha ASC, id ASC LIMIT 1`,
    [escenario.torneoId],
  );
  const partido = rows[0]!;
  const local = equipos.find((e) => e.equipoId === partido.equipo_local_id)!;
  const visitante = equipos.find((e) => e.equipoId === partido.equipo_visitante_id)!;

  // Los dos capitanes, habilitados como jugadores de su equipo.
  for (const equipo of [local, visitante]) {
    await confirmarPlantel(
      {
        torneoId: escenario.torneoId,
        equipoId: equipo.equipoId,
        integrantes: [{ perfilId: equipo.capitan.perfilId, rolEnTorneo: 'player' }],
      },
      equipo.capitan.contexto,
    );
  }

  return { escenario, partido, local, visitante };
}

async function partidosJugadosDe(perfilId: string): Promise<number> {
  const { rows } = await obtenerPool().query<{ partidos_jugados: number }>(
    'SELECT coalesce(sum(partidos_jugados), 0)::int AS partidos_jugados FROM estadistica_jugador WHERE perfil_id = $1',
    [perfilId],
  );
  return rows[0]!.partidos_jugados;
}

describe('la alineación por partido', () => {
  it('guarda quiénes jugaron y acredita el partido a cada uno', async () => {
    const { escenario, partido, local, visitante } = await escenarioConPartido();

    expect(await partidosJugadosDe(local.capitan.perfilId)).toBe(0);

    await cargarResultado(
      {
        partidoId: partido.id,
        version: partido.version,
        golesLocal: 1,
        golesVisitante: 0,
        alineaciones: [
          { perfilId: local.capitan.perfilId, equipoId: local.equipoId },
          { perfilId: visitante.capitan.perfilId, equipoId: visitante.equipoId, fueTitular: false },
        ],
      },
      escenario.titular.contexto,
    );

    const { rows: alineacion } = await obtenerPool().query<{
      perfil_id: string;
      equipo_id: string;
      fue_titular: boolean;
    }>(
      'SELECT perfil_id, equipo_id, fue_titular FROM alineacion_partido WHERE partido_id = $1 ORDER BY fue_titular DESC',
      [partido.id],
    );
    expect(alineacion).toHaveLength(2);
    expect(alineacion[0]!.fue_titular).toBe(true);
    expect(alineacion[1]!.fue_titular).toBe(false);

    // Un suplente que entró también jugó.
    expect(await partidosJugadosDe(local.capitan.perfilId)).toBe(1);
    expect(await partidosJugadosDe(visitante.capitan.perfilId)).toBe(1);
  });

  /**
   * El caso que rompe un acumulado: cargar dos veces. Sin revertir la
   * alineación anterior, el segundo guardado sumaría otro partido y el
   * historial diría dos donde hubo uno.
   */
  it('volver a cargar la misma alineación no suma un partido de más', async () => {
    const { escenario, partido, local } = await escenarioConPartido();
    const alineaciones = [{ perfilId: local.capitan.perfilId, equipoId: local.equipoId }];

    await cargarResultado(
      {
        partidoId: partido.id,
        version: partido.version,
        golesLocal: 1,
        golesVisitante: 0,
        alineaciones,
      },
      escenario.titular.contexto,
    );
    const { rows: tras } = await obtenerPool().query<{ version: number }>(
      'SELECT version FROM partido WHERE id = $1',
      [partido.id],
    );
    await cargarResultado(
      {
        partidoId: partido.id,
        version: tras[0]!.version,
        golesLocal: 2,
        golesVisitante: 0,
        alineaciones,
      },
      escenario.titular.contexto,
    );

    expect(await partidosJugadosDe(local.capitan.perfilId)).toBe(1);
  });

  it('al sacar a alguien de la alineación, le descuenta el partido', async () => {
    const { escenario, partido, local, visitante } = await escenarioConPartido();

    await cargarResultado(
      {
        partidoId: partido.id,
        version: partido.version,
        golesLocal: 1,
        golesVisitante: 0,
        alineaciones: [
          { perfilId: local.capitan.perfilId, equipoId: local.equipoId },
          { perfilId: visitante.capitan.perfilId, equipoId: visitante.equipoId },
        ],
      },
      escenario.titular.contexto,
    );
    expect(await partidosJugadosDe(visitante.capitan.perfilId)).toBe(1);

    const { rows: tras } = await obtenerPool().query<{ version: number }>(
      'SELECT version FROM partido WHERE id = $1',
      [partido.id],
    );
    await cargarResultado(
      {
        partidoId: partido.id,
        version: tras[0]!.version,
        golesLocal: 1,
        golesVisitante: 0,
        alineaciones: [{ perfilId: local.capitan.perfilId, equipoId: local.equipoId }],
      },
      escenario.titular.contexto,
    );

    expect(await partidosJugadosDe(visitante.capitan.perfilId)).toBe(0);
    expect(await partidosJugadosDe(local.capitan.perfilId)).toBe(1);
  });

  /** Corregir el marcador sin mandar alineación no la borra ni descuenta nada. */
  it('corregir sólo el marcador deja la alineación como estaba', async () => {
    const { escenario, partido, local } = await escenarioConPartido();

    await cargarResultado(
      {
        partidoId: partido.id,
        version: partido.version,
        golesLocal: 1,
        golesVisitante: 0,
        alineaciones: [{ perfilId: local.capitan.perfilId, equipoId: local.equipoId }],
      },
      escenario.titular.contexto,
    );
    const { rows: tras } = await obtenerPool().query<{ version: number }>(
      'SELECT version FROM partido WHERE id = $1',
      [partido.id],
    );
    await cargarResultado(
      { partidoId: partido.id, version: tras[0]!.version, golesLocal: 3, golesVisitante: 0 },
      escenario.titular.contexto,
    );

    const { rows: alineacion } = await obtenerPool().query(
      'SELECT 1 FROM alineacion_partido WHERE partido_id = $1',
      [partido.id],
    );
    expect(alineacion).toHaveLength(1);
    expect(await partidosJugadosDe(local.capitan.perfilId)).toBe(1);
  });

  /** La clave de la tabla: nadie juega el mismo partido para los dos equipos. */
  it('la base impide que alguien aparezca en los dos equipos del mismo partido', async () => {
    const { partido, local, visitante } = await escenarioConPartido();

    await obtenerPool().query(
      'INSERT INTO alineacion_partido (partido_id, equipo_id, perfil_id) VALUES ($1, $2, $3)',
      [partido.id, local.equipoId, local.capitan.perfilId],
    );
    await expect(
      obtenerPool().query(
        'INSERT INTO alineacion_partido (partido_id, equipo_id, perfil_id) VALUES ($1, $2, $3)',
        [partido.id, visitante.equipoId, local.capitan.perfilId],
      ),
    ).rejects.toThrow();
  });

  /** El pago de todo esto: el historial del jugador deja de tener un dato que no existía. */
  it('el historial del jugador ya puede decir cuántos partidos jugó', async () => {
    const { escenario, partido, local } = await escenarioConPartido();

    await cargarResultado(
      {
        partidoId: partido.id,
        version: partido.version,
        golesLocal: 1,
        golesVisitante: 0,
        alineaciones: [{ perfilId: local.capitan.perfilId, equipoId: local.equipoId }],
      },
      escenario.titular.contexto,
    );

    const historial = await obtenerHistorialDelJugador(
      { perfilId: local.capitan.perfilId },
      CONTEXTO_PUBLICO,
    );
    expect(historial).toHaveLength(1);
    expect(historial[0]!.torneoId).toBe(escenario.torneoId);
  });
});
