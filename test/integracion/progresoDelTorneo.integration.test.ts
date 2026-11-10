import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { obtenerPanelOrganizador } from '@/services/organizadores/obtenerPanelOrganizador';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import {
  crearTorneoDePrueba,
  inscribirEquipos,
  generarYConfirmarFixture,
  type EscenarioTorneo,
} from './_escenarios';

/**
 * El progreso del torneo en el panel del organizador ("Fecha N de M" y
 * su barra), contra Postgres real.
 *
 * Por qué hace falta acá y no alcanza la base simulada: el error estaba
 * en el SQL. El progreso contaba como pendientes sólo los partidos
 * `scheduled`, y un fixture recién confirmado tiene todos `unscheduled`
 * —sin fecha todavía—. Resultado: "Fecha 3 de 3" con la barra llena, en
 * un torneo con cinco de seis partidos sin jugar. La prueba unitaria
 * simula las filas que devuelve la consulta, así que nunca lo vio.
 */
async function progresoDe(escenario: EscenarioTorneo) {
  const panel = await obtenerPanelOrganizador(
    { organizacionId: escenario.organizacionId },
    escenario.titular.contexto,
  );
  const torneo = [
    ...panel.activos,
    ...panel.proximos,
    ...panel.finalizados,
    ...panel.necesitanAtencion,
  ].find((t) => t.id === escenario.torneoId);
  return torneo?.progreso ?? null;
}

async function partidosPorFecha(torneoId: string) {
  const { rows } = await obtenerPool().query<{
    id: string;
    version: number;
    numero_fecha: number;
  }>(
    `SELECT id, version, numero_fecha FROM partido
     WHERE torneo_id = $1 ORDER BY numero_fecha ASC, id ASC`,
    [torneoId],
  );
  return rows;
}

async function cargar(partido: { id: string; version: number }, escenario: EscenarioTorneo) {
  await cargarResultado(
    { partidoId: partido.id, version: partido.version, golesLocal: 2, golesVisitante: 1 },
    escenario.titular.contexto,
  );
}

describe('el progreso del torneo en el panel', () => {
  it('con el fixture sin programar y un solo partido jugado, va en la fecha 1 y la barra vacía', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    const partidos = await partidosPorFecha(escenario.torneoId);
    // Liga de 4: 3 fechas de 2 partidos, todos sin fecha todavía.
    expect(new Set(partidos.map((p) => p.numero_fecha)).size).toBe(3);
    const { rows: estados } = await obtenerPool().query<{ estado: string }>(
      'SELECT DISTINCT estado FROM partido WHERE torneo_id = $1',
      [escenario.torneoId],
    );
    expect(estados.map((e) => e.estado)).toEqual(['unscheduled']);

    await cargar(partidos[0]!, escenario);

    // El caso exacto del bug: antes daba fechaActual 3.
    expect(await progresoDe(escenario)).toEqual({
      fechaActual: 1,
      fechaTotal: 3,
      fechasCompletas: 0,
    });
  });

  it('cerrada la fecha 1, pasa a la 2 y la barra marca una de tres', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    const partidos = await partidosPorFecha(escenario.torneoId);
    for (const partido of partidos.filter((p) => p.numero_fecha === 1)) {
      await cargar(partido, escenario);
    }

    expect(await progresoDe(escenario)).toEqual({
      fechaActual: 2,
      fechaTotal: 3,
      fechasCompletas: 1,
    });
  });

  it('jugado todo, queda en la última fecha con la barra llena', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    for (const partido of await partidosPorFecha(escenario.torneoId)) {
      await cargar(partido, escenario);
    }

    expect(await progresoDe(escenario)).toEqual({
      fechaActual: 3,
      fechaTotal: 3,
      fechasCompletas: 3,
    });
  });
});
