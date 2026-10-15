import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { esErrorDeAplicacion } from '@/lib/errores';
import { obtenerPartido } from '@/services/competencia/obtenerPartido';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
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
 * Esta prueba no verifica un arreglo: **fija lo que hoy pasa de
 * verdad**, para poder comparar contra lo que la especificación dice.
 * `01` (actores) y `02` (UC-31, UC-34) dicen:
 *
 * - El **Colaborador** tiene permisos fijos que incluyen "cargar
 *   resultados **y eventos**". Es el caso que motiva el rol: el
 *   planillero contratado para el torneo (`06`, D-32).
 * - Cargan el **Capitán o Delegado** de cualquiera de los dos equipos.
 *
 * Lo que se mide acá es la distancia entre eso y el código.
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
   * **El hueco.** El colaborador puede cargar —lo de arriba lo prueba—
   * pero la única pantalla desde donde se cargan goles y tarjetas vive
   * bajo `/torneo/[id]/gestionar`, cuyo layout entra por
   * `obtenerGestionTorneo`, que pide `configurar_torneo`. Y
   * `configurar_torneo` es exactamente lo que `02` (UC-25) y `06`
   * (D-32) le niegan al colaborador.
   *
   * O sea: tiene el permiso y no tiene por dónde ejercerlo.
   */
  it('…pero no puede abrir la pantalla donde se cargan: el layout pide configurar_torneo', async () => {
    const { escenario } = await escenarioConPartido();
    const colaborador = await crearUsuarioDePrueba('Planillero del complejo');
    await asignarColaborador(
      { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId },
      escenario.titular.contexto,
    );

    const codigo = await codigoDelFallo(() =>
      obtenerGestionTorneo({ torneoId: escenario.torneoId }, colaborador.contexto),
    );
    expect(codigo).toBe('SIN_PERMISO');
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
   * UC-31 y UC-34 dicen "Capitán **o Delegado**". El servicio mira sólo
   * `captain` (`esCapitanDeAlgunEquipo`). Y es inconsistente consigo
   * mismo: `_rival.ts` acepta capitán y delegado para **objetar**, así
   * que un delegado puede discutir un resultado que no puede cargar.
   */
  it('el delegado no puede cargar, aunque la especificación lo nombre', async () => {
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

    const visto = await obtenerPartido({ partidoId }, delegado.contexto);
    expect(visto.puedeCargarResultado).toBe(false);

    const codigo = await codigoDelFallo(() =>
      cargarResultado(
        { partidoId, version: 1, golesLocal: 1, golesVisitante: 0 },
        delegado.contexto,
      ),
    );
    expect(codigo).toBe('SIN_PERMISO');
  });
});
