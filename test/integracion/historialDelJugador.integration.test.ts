import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { obtenerHistorialDelJugador } from '@/services/identidad/obtenerHistorialDelJugador';
import { confirmarPlantel } from '@/services/inscripciones/confirmarPlantel';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { crearTorneoDePrueba, inscribirEquipos, generarYConfirmarFixture } from './_escenarios';

/**
 * T27 / UC-38 — El historial del jugador contra Postgres real.
 *
 * Lo que se verifica acá y no se puede con la base simulada: que el
 * historial salga de la lista de buena fe y no de `estadistica_jugador`,
 * para que quien jugó sin hacer un gol aparezca igual; y que el
 * `DISTINCT ON` no duplique un torneo cuando alguien está habilitado con
 * dos roles.
 */
describe('el historial del jugador', () => {
  it('lista el torneo aunque no haya hecho ningún gol', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    const [primero] = await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    // El capitán se anota en la lista de buena fe de su equipo. No hace
    // goles ni ve tarjetas: `estadistica_jugador` no va a tener fila.
    await confirmarPlantel(
      {
        torneoId: escenario.torneoId,
        equipoId: primero!.equipoId,
        integrantes: [{ perfilId: primero!.capitan.perfilId, rolEnTorneo: 'player' }],
      },
      primero!.capitan.contexto,
    );

    const { rows: estadisticas } = await obtenerPool().query<{ total: string }>(
      'SELECT count(*) AS total FROM estadistica_jugador WHERE perfil_id = $1',
      [primero!.capitan.perfilId],
    );
    expect(Number(estadisticas[0]!.total)).toBe(0);

    const historial = await obtenerHistorialDelJugador(
      { perfilId: primero!.capitan.perfilId },
      CONTEXTO_PUBLICO,
    );

    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({
      torneoId: escenario.torneoId,
      equipoId: primero!.equipoId,
      rolEnTorneo: 'player',
      goles: 0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      vecesJugadorDelPartido: 0,
    });
    expect(historial[0]!.torneoNombre).toBeTruthy();
    expect(historial[0]!.equipoNombre).toBeTruthy();
    // Las fechas salen en ISO, no como objeto `Date`.
    expect(typeof historial[0]!.fechaInicio).toBe('string');
  });

  it('cuenta los goles del torneo cuando los hubo', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    const [primero] = await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);
    await confirmarPlantel(
      {
        torneoId: escenario.torneoId,
        equipoId: primero!.equipoId,
        integrantes: [{ perfilId: primero!.capitan.perfilId, rolEnTorneo: 'player' }],
      },
      primero!.capitan.contexto,
    );

    const { rows: partido } = await obtenerPool().query<{ id: string; version: number }>(
      `SELECT id, version FROM partido
       WHERE torneo_id = $1 AND (equipo_local_id = $2 OR equipo_visitante_id = $2)
       ORDER BY numero_fecha ASC LIMIT 1`,
      [escenario.torneoId, primero!.equipoId],
    );
    const { rows: comoLocal } = await obtenerPool().query<{ es_local: boolean }>(
      'SELECT equipo_local_id = $2 AS es_local FROM partido WHERE id = $1',
      [partido[0]!.id, primero!.equipoId],
    );
    const esLocal = comoLocal[0]!.es_local;

    await cargarResultado(
      {
        partidoId: partido[0]!.id,
        version: partido[0]!.version,
        golesLocal: esLocal ? 2 : 0,
        golesVisitante: esLocal ? 0 : 2,
        eventos: [
          {
            perfilId: primero!.capitan.perfilId,
            equipoId: primero!.equipoId,
            tipoEvento: 'goal',
          },
          {
            perfilId: primero!.capitan.perfilId,
            equipoId: primero!.equipoId,
            tipoEvento: 'goal',
          },
        ],
      },
      escenario.titular.contexto,
    );

    const historial = await obtenerHistorialDelJugador(
      { perfilId: primero!.capitan.perfilId },
      CONTEXTO_PUBLICO,
    );

    expect(historial).toHaveLength(1);
    expect(historial[0]!.goles).toBe(2);
  });

  /** La clave de `integrante_habilitado` incluye el rol: sin `DISTINCT ON` el torneo saldría dos veces. */
  it('con dos roles en el mismo torneo, lo lista una sola vez y como jugador', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    const [primero] = await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);
    await confirmarPlantel(
      {
        torneoId: escenario.torneoId,
        equipoId: primero!.equipoId,
        integrantes: [
          { perfilId: primero!.capitan.perfilId, rolEnTorneo: 'player' },
          { perfilId: primero!.capitan.perfilId, rolEnTorneo: 'delegate' },
        ],
      },
      primero!.capitan.contexto,
    );

    const historial = await obtenerHistorialDelJugador(
      { perfilId: primero!.capitan.perfilId },
      CONTEXTO_PUBLICO,
    );

    expect(historial).toHaveLength(1);
    expect(historial[0]!.rolEnTorneo).toBe('player');
  });

  it('sin torneos jugados, devuelve una lista vacía', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    const [primero] = await inscribirEquipos(escenario, 1);

    const historial = await obtenerHistorialDelJugador(
      { perfilId: primero!.capitan.perfilId },
      CONTEXTO_PUBLICO,
    );
    expect(historial).toEqual([]);
    expect(escenario.torneoId).toBeTruthy();
  });
});
