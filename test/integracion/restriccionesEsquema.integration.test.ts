import { afterAll, describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { inscribirEquipoManual } from '@/services/inscripciones/inscribirEquipoManual';
import { crearTorneoDePrueba, crearUsuarioDePrueba, inscribirEquipos } from './_escenarios';

/**
 * T27 — "No alcanza con validarlas en el servicio: van también en el
 * esquema" (`10`, 3.2). Cada test intenta, con SQL crudo, exactamente
 * lo que la restricción tiene que impedir — contra Postgres real, no
 * contra un mock que no puede rechazar nada por su cuenta.
 */

describe('restricciones del esquema (`10`, 3.2) contra Postgres real', () => {
  afterAll(async () => {
    await obtenerPool().end();
  });

  it(
    'equipo.perfil_capitan_id NO es NOT NULL a pesar de lo que dice `10`, 3.2 — ' +
      'D-29b (T12) lo relajó a propósito para equipos cargados a mano sin capitán todavía',
    async () => {
      // La tabla de `10`, 3.2 documenta esta columna como no nula
      // ("Todo equipo tiene siempre exactamente un capitán", D-13), pero
      // T12 encontró un segundo camino de alta legítimo que esa regla no
      // había anticipado (`inscribirEquipoManual`, UC-26, D-29b: un
      // organizador carga un equipo que no existe en la plataforma
      // todavía, sin nadie a quien asignarle la capitanía) y relajó la
      // restricción en el propio esquema (migración
      // `ajustes-para-inscripciones`). Agregar la NOT NULL de vuelta —el
      // primer intento de este test— rompe ese camino real; este test
      // deja probado el estado correcto para que no se repita el error.
      const escenario = await crearTorneoDePrueba();
      const resultado = await inscribirEquipoManual(
        { torneoId: escenario.torneoId, nombre: 'Equipo sin capitán', categoriaGenero: 'mixed' },
        escenario.titular.contexto,
      );
      const { rows } = await obtenerPool().query<{ perfil_capitan_id: string | null }>(
        'SELECT perfil_capitan_id FROM equipo WHERE id = $1',
        [resultado.equipoId],
      );
      expect(rows[0]!.perfil_capitan_id).toBeNull();
    },
  );

  it('organizacion.usuario_titular_id es NOT NULL — toda organización tiene siempre un titular (`02`, UC-06)', async () => {
    const pool = obtenerPool();
    await expect(
      pool.query(`INSERT INTO organizacion (nombre) VALUES ($1)`, ['Organización sin titular']),
    ).rejects.toThrow(/usuario_titular_id/i);
  });

  it('un jugador no puede quedar habilitado como player en dos equipos del mismo torneo (`06`, D-17b)', async () => {
    const pool = obtenerPool();
    const escenario = await crearTorneoDePrueba();
    const equipos = await inscribirEquipos(escenario, 2);
    const jugador = await crearUsuarioDePrueba();

    await pool.query(
      `INSERT INTO integrante_habilitado (torneo_id, equipo_id, perfil_id, rol_en_torneo) VALUES ($1, $2, $3, 'player')`,
      [escenario.torneoId, equipos[0]!.equipoId, jugador.perfilId],
    );

    await expect(
      pool.query(
        `INSERT INTO integrante_habilitado (torneo_id, equipo_id, perfil_id, rol_en_torneo) VALUES ($1, $2, $3, 'player')`,
        [escenario.torneoId, equipos[1]!.equipoId, jugador.perfilId],
      ),
    ).rejects.toThrow();
  });

  it('partido.goles_local y goles_visitante no pueden ser negativos', async () => {
    const pool = obtenerPool();
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 2 });
    await inscribirEquipos(escenario, 2);
    const { rows: fase } = await pool.query<{ id: string }>(
      'SELECT id FROM fase WHERE torneo_id = $1 LIMIT 1',
      [escenario.torneoId],
    );
    const { rows: inscriptos } = await pool.query<{ equipo_id: string }>(
      `SELECT equipo_id FROM inscripcion WHERE torneo_id = $1 ORDER BY equipo_id LIMIT 2`,
      [escenario.torneoId],
    );

    await expect(
      pool.query(
        `INSERT INTO partido (torneo_id, fase_id, numero_fecha, equipo_local_id, equipo_visitante_id, goles_local)
         VALUES ($1, $2, 1, $3, $4, -1)`,
        [escenario.torneoId, fase[0]!.id, inscriptos[0]!.equipo_id, inscriptos[1]!.equipo_id],
      ),
    ).rejects.toThrow();
  });

  it('partido solo puede involucrar equipos efectivamente inscriptos — FK hacia inscripcion, no hacia equipo (`03`, 3.9)', async () => {
    const pool = obtenerPool();
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 2 });
    const equipos = await inscribirEquipos(escenario, 2);
    const otroCapitan = await crearUsuarioDePrueba();
    const equipoNoInscripto = await crearEquipo(
      { nombre: 'Equipo no inscripto', categoriaGenero: 'mixed' },
      otroCapitan.contexto,
    );
    const { rows: fase } = await pool.query<{ id: string }>(
      'SELECT id FROM fase WHERE torneo_id = $1 LIMIT 1',
      [escenario.torneoId],
    );

    await expect(
      pool.query(
        `INSERT INTO partido (torneo_id, fase_id, numero_fecha, equipo_local_id, equipo_visitante_id)
         VALUES ($1, $2, 1, $3, $4)`,
        [escenario.torneoId, fase[0]!.id, equipoNoInscripto.id, equipos[0]!.equipoId],
      ),
    ).rejects.toThrow();
  });

  it('reglamento es único por (torneo_id, numero_version) — el versionado no admite huecos ni repetidos (`06`, D-28)', async () => {
    const pool = obtenerPool();
    const escenario = await crearTorneoDePrueba();

    await pool.query(
      `INSERT INTO reglamento (torneo_id, numero_version, texto, estado, publicado_por_usuario_id)
       VALUES ($1, 1, 'v1', 'current', $2)`,
      [escenario.torneoId, escenario.titular.usuarioId],
    );

    await expect(
      pool.query(
        `INSERT INTO reglamento (torneo_id, numero_version, texto, estado, publicado_por_usuario_id)
         VALUES ($1, 1, 'v1 otra vez', 'superseded', $2)`,
        [escenario.torneoId, escenario.titular.usuarioId],
      ),
    ).rejects.toThrow();
  });
});
