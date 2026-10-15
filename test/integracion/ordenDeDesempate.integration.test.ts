import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { obtenerTabla } from '@/services/posiciones/obtenerTabla';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { actualizarTorneo } from '@/services/torneos/actualizarTorneo';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { crearTorneoDePrueba, inscribirEquipos, generarYConfirmarFixture } from './_escenarios';

/**
 * El orden de desempate decide quién termina arriba en un grupo
 * empatado — o sea quién clasifica. `obtenerTabla` lo aplica leyendo
 * `torneo.criterios_desempate`, y hasta ahora sólo se podía elegir al
 * crear el torneo, desde la API: ninguna pantalla lo mostraba ni lo
 * cambiaba.
 *
 * La prueba no mira la columna sino el efecto: con los mismos
 * resultados, cambiar el orden **da vuelta la tabla**. Si no diera
 * vuelta, el control nuevo sería un formulario que guarda algo que no
 * hace nada.
 */
describe('el orden de desempate', () => {
  it('cambiarlo reordena la tabla con los mismos resultados', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    const pool = obtenerPool();
    // Dos partidos de la misma fecha: cuatro equipos distintos.
    const { rows: partidos } = await pool.query<{
      id: string;
      equipo_local_id: string;
      grupo_id: string;
    }>(
      `SELECT id, equipo_local_id, grupo_id FROM partido
       WHERE torneo_id = $1 AND numero_fecha = 1 ORDER BY id LIMIT 2`,
      [escenario.torneoId],
    );
    expect(partidos).toHaveLength(2);

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    const versionDe = (id: string) => gestion.partidos.find((p) => p.id === id)!.version;

    // A gana 2-0: mejor diferencia de gol (+2) y menos goles (2).
    await cargarResultado(
      {
        partidoId: partidos[0]!.id,
        version: versionDe(partidos[0]!.id),
        golesLocal: 2,
        golesVisitante: 0,
      },
      escenario.titular.contexto,
    );
    // B gana 3-2: peor diferencia (+1) y más goles (3).
    await cargarResultado(
      {
        partidoId: partidos[1]!.id,
        version: versionDe(partidos[1]!.id),
        golesLocal: 3,
        golesVisitante: 2,
      },
      escenario.titular.contexto,
    );
    const a = partidos[0]!.equipo_local_id;
    const b = partidos[1]!.equipo_local_id;

    // Los dos con 3 puntos: el desempate es lo único que los separa.
    const [porDiferencia] = await obtenerTabla(
      { grupoId: partidos[0]!.grupo_id },
      CONTEXTO_PUBLICO,
    );
    const puntos = Object.fromEntries(porDiferencia!.filas.map((f) => [f.equipoId, f.puntos]));
    expect(puntos[a]).toBe(3);
    expect(puntos[b]).toBe(3);

    // Por defecto manda la diferencia de gol: A arriba.
    const ordenPorDiferencia = porDiferencia!.filas.map((f) => f.equipoId);
    expect(ordenPorDiferencia.indexOf(a)).toBeLessThan(ordenPorDiferencia.indexOf(b));

    await actualizarTorneo(
      {
        torneoId: escenario.torneoId,
        criteriosDesempate: ['goals_for', 'goal_difference', 'head_to_head'],
      },
      escenario.titular.contexto,
    );

    // Con los goles a favor primero, se da vuelta.
    const [porGoles] = await obtenerTabla({ grupoId: partidos[0]!.grupo_id }, CONTEXTO_PUBLICO);
    const ordenPorGoles = porGoles!.filas.map((f) => f.equipoId);
    expect(ordenPorGoles.indexOf(b)).toBeLessThan(ordenPorGoles.indexOf(a));
  });

  /** Lo que se guarda es lo que la pantalla vuelve a leer. */
  it('se guarda y se vuelve a leer en orden', async () => {
    const escenario = await crearTorneoDePrueba();
    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    expect(gestion.reglas.criteriosDesempate).toEqual([
      'goal_difference',
      'goals_for',
      'head_to_head',
    ]);

    await actualizarTorneo(
      { torneoId: escenario.torneoId, criteriosDesempate: ['head_to_head', 'goals_for'] },
      escenario.titular.contexto,
    );

    const despues = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    expect(despues.reglas.criteriosDesempate).toEqual(['head_to_head', 'goals_for']);
  });
});
