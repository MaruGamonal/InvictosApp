import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { obtenerTabla } from '@/services/posiciones/obtenerTabla';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { crearTorneoDePrueba, inscribirEquipos, generarYConfirmarFixture } from './_escenarios';

/**
 * T27 — La tabla de posiciones contra Postgres real.
 *
 * Lo que se verifica acá y no se puede verificar con la base simulada:
 * que el `LEFT JOIN` contra `posicion` traiga igual a los equipos que
 * todavía no tienen fila. `posicion` se escribe recién con el primer
 * resultado de cada equipo, así que antes de eso la consulta vieja
 * —`FROM posicion`— devolvía cero filas y la pantalla decía que no hay
 * tabla, con el fixture ya confirmado.
 */
async function faseDelTorneo(torneoId: string): Promise<string> {
  const { rows } = await obtenerPool().query<{ id: string }>(
    'SELECT id FROM fase WHERE torneo_id = $1 ORDER BY orden ASC LIMIT 1',
    [torneoId],
  );
  return rows[0]!.id;
}

describe('la tabla de posiciones', () => {
  it('con el fixture confirmado y sin ningún resultado, muestra a todos en cero', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    // Ni una fila todavía: es el estado exacto en el que la tabla
    // aparecía vacía.
    const { rows: posiciones } = await obtenerPool().query<{ total: string }>(
      `SELECT count(*) AS total FROM posicion p
       JOIN grupo g ON g.id = p.grupo_id
       JOIN fase f ON f.id = g.fase_id
       WHERE f.torneo_id = $1`,
      [escenario.torneoId],
    );
    expect(Number(posiciones[0]!.total)).toBe(0);

    const tabla = await obtenerTabla(
      { faseId: await faseDelTorneo(escenario.torneoId) },
      CONTEXTO_PUBLICO,
    );

    expect(tabla).toHaveLength(1);
    expect(tabla[0]!.filas).toHaveLength(4);
    for (const fila of tabla[0]!.filas) {
      expect(fila.puntos).toBe(0);
      expect(fila.partidosJugados).toBe(0);
      expect(fila.diferenciaGol).toBe(0);
      expect(fila.ganadosPorPresentacion).toBe(0);
      expect(fila.equipoNombre).toBeTruthy();
    }

    // Orden estable cuando todo está empatado en cero: por nombre, para
    // que la pantalla no cambie de orden entre dos cargas.
    const nombres = tabla[0]!.filas.map((fila) => fila.equipoNombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b)));
  });

  it('cargado un resultado, quien ganó queda arriba y el resto sigue en cero', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    const { rows: partido } = await obtenerPool().query<{
      id: string;
      version: number;
      equipo_local_id: string;
    }>(
      `SELECT id, version, equipo_local_id FROM partido
       WHERE torneo_id = $1 ORDER BY numero_fecha ASC, id ASC LIMIT 1`,
      [escenario.torneoId],
    );
    await cargarResultado(
      {
        partidoId: partido[0]!.id,
        version: partido[0]!.version,
        golesLocal: 3,
        golesVisitante: 1,
      },
      escenario.titular.contexto,
    );

    const tabla = await obtenerTabla(
      { faseId: await faseDelTorneo(escenario.torneoId) },
      CONTEXTO_PUBLICO,
    );

    // Los cuatro siguen estando: los dos que jugaron y los dos que no.
    expect(tabla[0]!.filas).toHaveLength(4);

    const ganador = tabla[0]!.filas[0]!;
    expect(ganador.equipoId).toBe(partido[0]!.equipo_local_id);
    expect(ganador.puntos).toBe(3);
    expect(ganador.diferenciaGol).toBe(2);
    expect(ganador.partidosJugados).toBe(1);

    const sinJugar = tabla[0]!.filas.filter((fila) => fila.partidosJugados === 0);
    expect(sinJugar).toHaveLength(2);
    for (const fila of sinJugar) expect(fila.puntos).toBe(0);
  });
});
