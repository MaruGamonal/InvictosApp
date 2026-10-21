import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { esErrorDeAplicacion } from '@/lib/errores';
import { obtenerPartido } from '@/services/competencia/obtenerPartido';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { actualizarTorneo } from '@/services/torneos/actualizarTorneo';
import { ajustarPuntos } from '@/services/posiciones/ajustarPuntos';
import { asignarColaborador } from '@/services/organizadores/asignarColaborador';
import { invitarIntegrante } from '@/services/equipos/invitarIntegrante';
import { responderInvitacion } from '@/services/equipos/responderInvitacion';
import {
  crearTorneoDePrueba,
  crearUsuarioDePrueba,
  inscribirEquipos,
  generarYConfirmarFixture,
} from './_escenarios';

/**
 * Quién puede cargar la planilla —resultado, goles y tarjetas— y desde
 * dónde.
 *
 * `01` (actores) y `02` (UC-31, UC-34) dicen dos cosas que el código no
 * cumplía:
 *
 * - El **Colaborador** tiene permisos fijos que incluyen "cargar
 *   resultados **y eventos**" (`06`, D-32). El servicio lo aceptaba,
 *   pero la única pantalla que carga goles y tarjetas vive detrás del
 *   guard de `/torneo/[id]/gestionar`, que pedía `configurar_torneo` —
 *   justo lo que D-32 le niega. Tenía el permiso y ninguna puerta: el
 *   planillero contratado para el torneo, que es el caso que motiva el
 *   rol entero, no podía cargar nada.
 * - Cargan el **Capitán o Delegado**. El código miraba sólo `captain`.
 *
 * Esta prueba va contra Postgres porque lo que hay que verificar no es
 * una función sino que la cadena cierre: que el permiso que abre la
 * pantalla sea el mismo que acepta el servicio, y que lo que no es del
 * colaborador le siga estando cerrado.
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
  const local = equipos.find((e) => e.equipoId === partido.equipo_local_id)!;

  return { escenario, partidoId: partido.id, local };
}

/** Código del error, o `null` si no falló. */
async function codigoDelFallo(accion: () => Promise<unknown>): Promise<string | null> {
  try {
    await accion();
    return null;
  } catch (error) {
    if (esErrorDeAplicacion(error)) return error.codigo;
    throw error;
  }
}

describe('quién carga la planilla del partido', () => {
  it('el colaborador puede cargar resultado y eventos: el servicio lo acepta', async () => {
    const { escenario, partidoId, local } = await escenarioConPartido();
    const colaborador = await crearUsuarioDePrueba('Planillero del complejo');
    await asignarColaborador(
      { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId },
      escenario.titular.contexto,
    );

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    const version = gestion.partidos.find((p) => p.id === partidoId)!.version;

    const resultado = await cargarResultado(
      { partidoId, version, golesLocal: 1, golesVisitante: 0 },
      colaborador.contexto,
    );
    // Nace confirmado: quien confirma es quien cargó (`06`, D-95).
    expect(resultado.estadoResultado).toBe('confirmed');
    expect(local).toBeDefined();
  });

  /**
   * Lo que estaba roto. La pantalla ahora abre por `cargar_resultados`,
   * que deja pasar al personal del torneo —Titular, Administrador y
   * Colaborador asignado— y a nadie más.
   */
  it('…y ahora abre la pantalla donde se cargan, con alcance de colaborador', async () => {
    const { escenario } = await escenarioConPartido();
    const colaborador = await crearUsuarioDePrueba('Planillero del complejo');
    await asignarColaborador(
      { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId },
      escenario.titular.contexto,
    );

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      colaborador.contexto,
    );
    expect(gestion.miRolEnTorneo).toBe('colaborador');
    expect(gestion.miRolEnOrganizacion).toBeNull();

    // Y recibe lo mismo que el organizador para hacer su trabajo: los
    // partidos con su `version` —que es lo que `cargarResultado`
    // necesita para el control de concurrencia— y los habilitados para
    // atribuirles goles y tarjetas. Se compara contra el organizador y
    // no contra un número fijo: así la afirmación no depende de cuántos
    // equipos arme el escenario ni de si confirmó listas de buena fe.
    const comoOrganizador = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    expect(gestion.partidos).toEqual(comoOrganizador.partidos);
    expect(gestion.elegiblesPorEquipo).toEqual(comoOrganizador.elegiblesPorEquipo);
    expect(gestion.partidos.length).toBeGreaterThan(0);
  });

  it('quien organiza sigue entrando con alcance completo', async () => {
    const { escenario } = await escenarioConPartido();
    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    expect(gestion.miRolEnTorneo).toBe('organizacion');
    expect(gestion.miRolEnOrganizacion).toBe('owner');
  });

  it('alguien sin vínculo con el torneo sigue sin entrar', async () => {
    const { escenario } = await escenarioConPartido();
    const ajeno = await crearUsuarioDePrueba('Alguien de afuera');
    const codigo = await codigoDelFallo(() =>
      obtenerGestionTorneo({ torneoId: escenario.torneoId }, ajeno.contexto),
    );
    expect(codigo).toBe('SIN_PERMISO');
  });

  /**
   * Abrir la pantalla **no** le abre lo que no es suyo. Esconder la
   * pestaña no alcanza: a la API se le puede pegar directo, así que lo
   * que tiene que decir que no es cada servicio.
   */
  it('pero lo que no es del colaborador le sigue estando cerrado en el backend', async () => {
    const { escenario } = await escenarioConPartido();
    const colaborador = await crearUsuarioDePrueba('Planillero del complejo');
    await asignarColaborador(
      { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId },
      escenario.titular.contexto,
    );

    // Configurar el torneo (`configurar_torneo`).
    expect(
      await codigoDelFallo(() =>
        actualizarTorneo(
          { torneoId: escenario.torneoId, nombre: 'Renombrado por el planillero' },
          colaborador.contexto,
        ),
      ),
    ).toBe('SIN_PERMISO');

    // Sancionar con quita de puntos (`configurar_torneo`).
    expect(
      await codigoDelFallo(() =>
        ajustarPuntos(
          {
            torneoId: escenario.torneoId,
            equipoId: escenario.ciudadId,
            ajuste: -3,
            motivo: 'No corresponde',
          },
          colaborador.contexto,
        ),
      ),
    ).toBe('SIN_PERMISO');

    // Repartir colaboradores (`asignar_colaboradores`).
    expect(
      await codigoDelFallo(() =>
        asignarColaborador(
          { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId },
          colaborador.contexto,
        ),
      ),
    ).toBe('SIN_PERMISO');
  });

  it('en la pantalla del partido el colaborador solo alcanza la alineación, no la planilla', async () => {
    const { escenario, partidoId } = await escenarioConPartido();
    const colaborador = await crearUsuarioDePrueba('Planillero del complejo');
    await asignarColaborador(
      { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId },
      escenario.titular.contexto,
    );

    const visto = await obtenerPartido({ partidoId }, colaborador.contexto);
    // `puedeCargarResultado` es del capitán, y el colaborador gestiona.
    expect(visto.puedeCargarResultado).toBe(false);
    // La alineación sí, pero recién con el partido jugado.
    expect(visto.puedeCargarAlineacion).toBe(false);
  });

  /**
   * UC-31 y UC-34 dicen "Capitán **o** Delegado". El código miraba sólo
   * `captain`, mientras `_rival.ts` aceptaba a los dos para objetar y
   * el propio `cargarResultado` le notificaba a los dos: un delegado se
   * enteraba del partido, podía discutir el resultado y no podía
   * cargarlo.
   */
  it('el delegado carga el resultado de su equipo, igual que el capitán', async () => {
    const { escenario, partidoId, local } = await escenarioConPartido();

    const delegado = await crearUsuarioDePrueba('Delegado del equipo');
    const { rows: perfilRows } = await obtenerPool().query<{ id: string }>(
      'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
      [delegado.usuarioId],
    );
    await invitarIntegrante(
      { equipoId: local.equipoId, roles: ['delegate'], perfilId: perfilRows[0]!.id },
      local.capitan.contexto,
    );
    await responderInvitacion({ equipoId: local.equipoId, aceptar: true }, delegado.contexto);

    // La pantalla se lo ofrece…
    const visto = await obtenerPartido({ partidoId }, delegado.contexto);
    expect(visto.puedeCargarResultado).toBe(true);

    // …y el servicio lo acepta, con el mismo estado que la carga de un
    // capitán: `loaded`, esperando que el rival responda (D-95).
    const resultado = await cargarResultado(
      { partidoId, version: visto.version, golesLocal: 2, golesVisitante: 1 },
      delegado.contexto,
    );
    expect(resultado.estadoResultado).toBe('loaded');
  });

  it('un jugador común del equipo sigue sin poder cargar', async () => {
    const { escenario, partidoId, local } = await escenarioConPartido();
    expect(escenario.torneoId).toBeDefined();

    const jugador = await crearUsuarioDePrueba('Jugador del plantel');
    const { rows: perfilRows } = await obtenerPool().query<{ id: string }>(
      'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
      [jugador.usuarioId],
    );
    await invitarIntegrante(
      { equipoId: local.equipoId, roles: ['player'], perfilId: perfilRows[0]!.id },
      local.capitan.contexto,
    );
    await responderInvitacion({ equipoId: local.equipoId, aceptar: true }, jugador.contexto);

    const visto = await obtenerPartido({ partidoId }, jugador.contexto);
    expect(visto.puedeCargarResultado).toBe(false);

    const codigo = await codigoDelFallo(() =>
      cargarResultado(
        { partidoId, version: visto.version, golesLocal: 1, golesVisitante: 0 },
        jugador.contexto,
      ),
    );
    expect(codigo).toBe('SIN_PERMISO');
  });
});
