import { afterAll, describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import {
  crearTorneoDePrueba,
  generarYConfirmarFixture,
  inscribirEquipos,
  type EscenarioTorneo,
} from './_escenarios';

/**
 * T27 — La transacción más importante del backlog (T15), contra
 * Postgres real: atomicidad ante una falla a mitad de camino, control
 * optimista de versión bajo dos escrituras concurrentes de verdad, y
 * equivalencia entre la tabla guardada y la que se recalcula desde los
 * partidos después de varias correcciones.
 */

interface FilaPartido {
  id: string;
  grupo_id: string;
  equipo_local_id: string;
  equipo_visitante_id: string;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: string;
  version: number;
}

async function partidosDelTorneo(torneoId: string): Promise<FilaPartido[]> {
  const { rows } = await obtenerPool().query<FilaPartido>(
    `SELECT id, grupo_id, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, estado, version
     FROM partido WHERE torneo_id = $1 ORDER BY numero_fecha ASC`,
    [torneoId],
  );
  return rows;
}

interface Puntajes {
  victoria: number;
  empate: number;
  derrota: number;
}

interface FilaTablaEsperada {
  puntos: number;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
}

/** Recalcula la tabla desde cero a partir de los partidos `played` de un grupo — independiente de `posicion`, para compararla contra lo guardado. */
async function recalcularTablaDesdePartidos(
  grupoId: string,
  puntajes: Puntajes,
): Promise<Map<string, FilaTablaEsperada>> {
  const { rows } = await obtenerPool().query<{
    equipo_local_id: string;
    equipo_visitante_id: string;
    goles_local: number;
    goles_visitante: number;
  }>(
    `SELECT equipo_local_id, equipo_visitante_id, goles_local, goles_visitante
     FROM partido WHERE grupo_id = $1 AND estado = 'played'`,
    [grupoId],
  );

  const tabla = new Map<string, FilaTablaEsperada>();
  const fila = (equipoId: string): FilaTablaEsperada => {
    const existente = tabla.get(equipoId);
    if (existente) return existente;
    const nueva: FilaTablaEsperada = {
      puntos: 0,
      partidosJugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      golesFavor: 0,
      golesContra: 0,
    };
    tabla.set(equipoId, nueva);
    return nueva;
  };

  for (const partido of rows) {
    const local = fila(partido.equipo_local_id);
    const visitante = fila(partido.equipo_visitante_id);
    local.partidosJugados += 1;
    visitante.partidosJugados += 1;
    local.golesFavor += partido.goles_local;
    local.golesContra += partido.goles_visitante;
    visitante.golesFavor += partido.goles_visitante;
    visitante.golesContra += partido.goles_local;

    if (partido.goles_local > partido.goles_visitante) {
      local.ganados += 1;
      local.puntos += puntajes.victoria;
      visitante.perdidos += 1;
      visitante.puntos += puntajes.derrota;
    } else if (partido.goles_local < partido.goles_visitante) {
      visitante.ganados += 1;
      visitante.puntos += puntajes.victoria;
      local.perdidos += 1;
      local.puntos += puntajes.derrota;
    } else {
      local.empatados += 1;
      local.puntos += puntajes.empate;
      visitante.empatados += 1;
      visitante.puntos += puntajes.empate;
    }
  }

  return tabla;
}

async function crearEscenarioConFixture(cupoEquipos: number): Promise<EscenarioTorneo> {
  const escenario = await crearTorneoDePrueba({ cupoEquipos });
  await inscribirEquipos(escenario, cupoEquipos);
  await generarYConfirmarFixture(escenario);
  return escenario;
}

describe('la transacción de cargarResultado (T15) contra Postgres real', () => {
  afterAll(async () => {
    await obtenerPool().end();
  });

  it('atomicidad: una falla a mitad de la transacción no deja nada modificado', async () => {
    const escenario = await crearEscenarioConFixture(2);
    const [partido] = await partidosDelTorneo(escenario.torneoId);
    const pool = obtenerPool();

    // Inyecto la falla en el segundo paso de la transacción (la
    // escritura de `posicion`) sin tocar el código de `cargarResultado`
    // ni los datos que lee: un trigger temporal que hace fallar
    // cualquier INSERT en `posicion`. El primer paso (el UPDATE de
    // `partido`) sigue pudiendo correr solo — es la falla a mitad de
    // camino real que el test necesita, no una que el propio UPDATE
    // rechace antes de llegar a la transacción. (Revocar el permiso de
    // escritura no sirve acá: el rol de conexión es dueño de la tabla, y
    // el dueño de una tabla ignora sus propios GRANT/REVOKE.)
    await pool.query(`
      CREATE OR REPLACE FUNCTION _fallar_a_proposito_test() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'falla inyectada por el test de atomicidad';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER _trg_fallar_a_proposito_test BEFORE INSERT ON posicion
        FOR EACH ROW EXECUTE FUNCTION _fallar_a_proposito_test();
    `);
    try {
      await expect(
        cargarResultado(
          { partidoId: partido!.id, version: partido!.version, golesLocal: 2, golesVisitante: 1 },
          escenario.titular.contexto,
        ),
      ).rejects.toThrow();
    } finally {
      await pool.query(`
        DROP TRIGGER _trg_fallar_a_proposito_test ON posicion;
        DROP FUNCTION _fallar_a_proposito_test();
      `);
    }

    const { rows: despues } = await pool.query<FilaPartido>(
      'SELECT id, grupo_id, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, estado, version FROM partido WHERE id = $1',
      [partido!.id],
    );
    expect(despues[0]!.goles_local).toBe(partido!.goles_local);
    expect(despues[0]!.goles_visitante).toBe(partido!.goles_visitante);
    expect(despues[0]!.estado).toBe(partido!.estado);
    expect(despues[0]!.version).toBe(partido!.version);
  });

  it('concurrencia: de dos escrituras reales sobre el mismo partido, una gana y la otra recibe CONFLICTO_DE_VERSION', async () => {
    const escenario = await crearEscenarioConFixture(2);
    const [partido] = await partidosDelTorneo(escenario.torneoId);

    const resultados = await Promise.allSettled([
      cargarResultado(
        { partidoId: partido!.id, version: partido!.version, golesLocal: 2, golesVisitante: 1 },
        escenario.titular.contexto,
      ),
      cargarResultado(
        { partidoId: partido!.id, version: partido!.version, golesLocal: 0, golesVisitante: 0 },
        escenario.titular.contexto,
      ),
    ]);

    const exitosos = resultados.filter((r) => r.status === 'fulfilled');
    const fallidos = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    expect(fallidos[0]!.reason).toMatchObject({ codigo: 'CONFLICTO_DE_VERSION' });

    // La tabla no puede haber contado el partido dos veces: si el
    // control de versión no fuera atómico, las dos escrituras
    // concurrentes podrían haber pasado juntas y duplicar el efecto.
    const { rows: posicionRows } = await obtenerPool().query<{ partidos_jugados: number }>(
      `SELECT partidos_jugados FROM posicion WHERE grupo_id = $1 AND equipo_id = $2`,
      [partido!.grupo_id, partido!.equipo_local_id],
    );
    expect(posicionRows[0]!.partidos_jugados).toBe(1);
  });

  it('equivalencia: con veinte resultados cargados y dos correcciones, la tabla guardada coincide con la recalculada desde los partidos', async () => {
    const CUPO = 8; // round-robin de 8 equipos: 28 partidos, más que alcanza para 20 cargas + 2 correcciones.
    const escenario = await crearEscenarioConFixture(CUPO);
    const pool = obtenerPool();

    const { rows: puntajesRows } = await pool.query<{
      puntos_victoria: number;
      puntos_empate: number;
      puntos_derrota: number;
    }>('SELECT puntos_victoria, puntos_empate, puntos_derrota FROM torneo WHERE id = $1', [
      escenario.torneoId,
    ]);
    const puntajes: Puntajes = {
      victoria: puntajesRows[0]!.puntos_victoria,
      empate: puntajesRows[0]!.puntos_empate,
      derrota: puntajesRows[0]!.puntos_derrota,
    };

    const partidos = await partidosDelTorneo(escenario.torneoId);
    const grupoId = partidos[0]!.grupo_id;
    const aCargar = partidos.slice(0, 20);

    // Distintos marcadores según el índice, para que no todos los
    // partidos sean el mismo resultado repetido.
    const versionesActuales = new Map<string, number>();
    for (const [indice, partido] of aCargar.entries()) {
      const golesLocal = indice % 4;
      const golesVisitante = (indice + 2) % 3;
      const resultado = await cargarResultado(
        { partidoId: partido.id, version: partido.version, golesLocal, golesVisitante },
        escenario.titular.contexto,
      );
      versionesActuales.set(partido.id, resultado.version);
    }

    // Dos correcciones: recargar un resultado ya cargado con un
    // marcador distinto, con la versión que quedó después de la carga.
    for (const partido of aCargar.slice(0, 2)) {
      const version = versionesActuales.get(partido.id)!;
      await cargarResultado(
        { partidoId: partido.id, version, golesLocal: 5, golesVisitante: 5 },
        escenario.titular.contexto,
      );
    }

    const tablaRecalculada = await recalcularTablaDesdePartidos(grupoId, puntajes);
    const { rows: posicionGuardada } = await pool.query<{
      equipo_id: string;
      puntos: number;
      partidos_jugados: number;
      ganados: number;
      empatados: number;
      perdidos: number;
      goles_favor: number;
      goles_contra: number;
    }>(
      `SELECT equipo_id, puntos, partidos_jugados, ganados, empatados, perdidos, goles_favor, goles_contra
       FROM posicion WHERE grupo_id = $1`,
      [grupoId],
    );

    expect(posicionGuardada.length).toBe(tablaRecalculada.size);
    for (const fila of posicionGuardada) {
      const esperada = tablaRecalculada.get(fila.equipo_id);
      expect(
        esperada,
        `el equipo ${fila.equipo_id} no aparece en la tabla recalculada`,
      ).toBeDefined();
      expect({
        puntos: fila.puntos,
        partidosJugados: fila.partidos_jugados,
        ganados: fila.ganados,
        empatados: fila.empatados,
        perdidos: fila.perdidos,
        golesFavor: fila.goles_favor,
        golesContra: fila.goles_contra,
      }).toEqual(esperada);
    }
  });
});
