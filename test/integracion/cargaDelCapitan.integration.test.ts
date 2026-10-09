import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { obtenerPartido } from '@/services/competencia/obtenerPartido';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { resolverInscripcion } from '@/services/inscripciones/resolverInscripcion';
import {
  crearTorneoDePrueba,
  crearUsuarioDePrueba,
  inscribirEquipos,
  generarYConfirmarFixture,
} from './_escenarios';

/**
 * UC-31 / D-07b — El capitán carga el resultado de su partido.
 *
 * `cargarResultado` aceptaba al capitán desde siempre, y su carga deja
 * el resultado en `loaded` en vez de `confirmed` (D-95): esperando que
 * el rival confirme u objete. Todo lo que vive después de eso estaba
 * construido —`confirmarResultado`, `disputarResultado`, el panel de
 * respuesta, la tarea horaria que confirma por vencimiento— pero
 * **ninguna pantalla dejaba cargar a un capitán**, así que ningún
 * resultado llegaba nunca a `loaded` y nada de eso podía ocurrir.
 *
 * Esto se prueba de punta a punta contra Postgres porque lo que hay que
 * verificar no es una función sino que la cadena cierre: que el permiso
 * que muestra la pantalla sea el mismo que acepta el servicio, y que
 * después de cargar, el rival —y sólo el rival— pueda responder.
 */

async function escenarioConPartido() {
  const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
  const equipos = await inscribirEquipos(escenario, 4);
  await generarYConfirmarFixture(escenario);

  const { rows } = await obtenerPool().query<{
    id: string;
    equipo_local_id: string;
    equipo_visitante_id: string;
  }>('SELECT id, equipo_local_id, equipo_visitante_id FROM partido WHERE torneo_id = $1 LIMIT 1', [
    escenario.torneoId,
  ]);
  const partido = rows[0]!;
  const capitanLocal = equipos.find((e) => e.equipoId === partido.equipo_local_id)!.capitan;
  const capitanVisitante = equipos.find((e) => e.equipoId === partido.equipo_visitante_id)!.capitan;

  return { escenario, partidoId: partido.id, capitanLocal, capitanVisitante };
}

describe('el capitán carga el resultado de su partido', () => {
  it('la pantalla se lo ofrece a los dos capitanes y a nadie más', async () => {
    const { escenario, partidoId, capitanLocal, capitanVisitante } = await escenarioConPartido();
    const ajeno = await crearUsuarioDePrueba('Alguien sin vínculo');

    for (const capitan of [capitanLocal, capitanVisitante]) {
      const visto = await obtenerPartido({ partidoId }, capitan.contexto);
      expect(visto.puedeCargarResultado).toBe(true);
    }

    expect((await obtenerPartido({ partidoId }, ajeno.contexto)).puedeCargarResultado).toBe(false);
    expect((await obtenerPartido({ partidoId }, CONTEXTO_PUBLICO)).puedeCargarResultado).toBe(
      false,
    );

    const visto = await obtenerPartido({ partidoId }, escenario.titular.contexto);
    expect(visto.puedeCargarResultado).toBe(false);
  });

  /**
   * El caso que de verdad ejercita el `!gestionaElTorneo`: en el fútbol
   * amateur quien organiza el torneo suele jugarlo también. Si se le
   * ofreciera el formulario del capitán, su carga pasaría igual por el
   * permiso de organizador y nacería `confirmed` (D-95) — o sea que la
   * pantalla le prometería "le llega al otro equipo para que lo
   * confirme" y no le llegaría a nadie.
   *
   * Lo escribo porque la primera versión de este test afirmaba que el
   * organizador no veía el formulario y pasaba por el motivo
   * equivocado: el titular no era capitán de ningún equipo, así que
   * sacar el `!gestionaElTorneo` no la hacía fallar.
   */
  it('a quien organiza y además es capitán, tampoco: su carga no esperaría respuesta de nadie', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    await inscribirEquipos(escenario, 3);

    // El cuarto equipo es del propio organizador, que así queda capitán
    // y titular de la organización a la vez.
    const suyo = await crearEquipo(
      {
        nombre: `Equipo del organizador ${Date.now()}`,
        categoriaGenero: 'mixed',
        ciudadId: escenario.ciudadId,
      },
      escenario.titular.contexto,
    );
    await solicitarInscripcion(
      { torneoId: escenario.torneoId, equipoId: suyo.id },
      escenario.titular.contexto,
    );
    await resolverInscripcion(
      { torneoId: escenario.torneoId, equipoId: suyo.id, decision: 'approved' },
      escenario.titular.contexto,
    );
    await generarYConfirmarFixture(escenario);

    const { rows } = await obtenerPool().query<{ id: string }>(
      `SELECT id FROM partido
       WHERE torneo_id = $1 AND (equipo_local_id = $2 OR equipo_visitante_id = $2)
       LIMIT 1`,
      [escenario.torneoId, suyo.id],
    );

    const visto = await obtenerPartido({ partidoId: rows[0]!.id }, escenario.titular.contexto);
    expect(visto.puedeCargarResultado).toBe(false);
  });

  /**
   * La cadena completa: carga el capitán local, queda esperando
   * respuesta, y el que puede responder es el visitante.
   */
  it('cargado por un capitán queda en loaded, y el rival puede responder', async () => {
    const { partidoId, capitanLocal, capitanVisitante } = await escenarioConPartido();

    const antes = await obtenerPartido({ partidoId }, capitanLocal.contexto);
    const resultado = await cargarResultado(
      { partidoId, version: antes.version, golesLocal: 2, golesVisitante: 1 },
      capitanLocal.contexto,
    );
    expect(resultado.estadoResultado).toBe('loaded');

    const paraElVisitante = await obtenerPartido({ partidoId }, capitanVisitante.contexto);
    expect(paraElVisitante.estadoResultado).toBe('loaded');
    expect(paraElVisitante.puedeResponder).toBe(true);
    // Ya no hay nada que cargar, y quien cargó no se responde a sí mismo.
    expect(paraElVisitante.puedeCargarResultado).toBe(false);

    const paraElLocal = await obtenerPartido({ partidoId }, capitanLocal.contexto);
    expect(paraElLocal.puedeResponder).toBe(false);
    expect(paraElLocal.puedeCargarResultado).toBe(false);
  });

  /**
   * `solo_organizador_carga_resultados` (D-07b) era un parámetro que el
   * organizador podía configurar y que nadie leía: viajaba por
   * `crearTorneo` y `actualizarTorneo`, se copiaba al crear una
   * división, y un capitán cargaba igual.
   */
  it('con la regla del torneo puesta, ni se le ofrece ni se le acepta', async () => {
    const { escenario, partidoId, capitanLocal } = await escenarioConPartido();
    await obtenerPool().query(
      'UPDATE torneo SET solo_organizador_carga_resultados = true WHERE id = $1',
      [escenario.torneoId],
    );

    const visto = await obtenerPartido({ partidoId }, capitanLocal.contexto);
    expect(visto.puedeCargarResultado).toBe(false);

    // Y esconder el formulario no alcanza: a la API se le puede pegar directo.
    await expect(
      cargarResultado(
        { partidoId, version: visto.version, golesLocal: 1, golesVisitante: 0 },
        capitanLocal.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'SOLO_ORGANIZADOR_CARGA_RESULTADOS' });

    // La regla es sobre los capitanes: quien organiza carga igual.
    const resultado = await cargarResultado(
      { partidoId, version: visto.version, golesLocal: 3, golesVisitante: 0 },
      escenario.titular.contexto,
    );
    expect(resultado.estadoResultado).toBe('confirmed');
  });
});
