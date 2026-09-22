import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { obtenerPool } from '@/db/cliente';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { avanzarEstado } from '@/services/torneos/avanzarEstado';
import { generarFixture } from '@/services/fixture/generarFixture';
import { confirmarFixture } from '@/services/fixture/confirmarFixture';
import {
  crearTorneoDePrueba,
  crearUsuarioDePrueba,
  inscribirEquipos,
  type EscenarioTorneo,
} from './_escenarios';

/**
 * La propuesta de fixture llega desde el cliente: los equipos y las
 * zonas que trae son entrada sin validar. Sin comprobarla, quien
 * configura **su** torneo podía crear partidos con cualquier equipo de
 * la plataforma, partidos de un equipo contra sí mismo, y partidos
 * apuntando a la zona de otro torneo.
 *
 * Contra Postgres real porque lo que se comprueba son relaciones entre
 * filas: inscripciones aprobadas y pertenencia de la zona a la fase.
 */

async function faseInicial(escenario: EscenarioTorneo): Promise<string> {
  const { rows } = await obtenerPool().query<{ id: string }>(
    'SELECT id FROM fase WHERE torneo_id = $1 ORDER BY orden ASC LIMIT 1',
    [escenario.torneoId],
  );
  return rows[0]!.id;
}

/** Un equipo que existe pero no está inscripto en este torneo. */
async function equipoAjeno(ciudadId: string): Promise<string> {
  const capitan = await crearUsuarioDePrueba(`Capitán ajeno ${randomUUID()}`);
  const equipo = await crearEquipo(
    { nombre: `Equipo ajeno ${randomUUID()}`, categoriaGenero: 'mixed', ciudadId },
    capitan.contexto,
  );
  return equipo.id;
}

async function prepararFaseCerrada(): Promise<{ escenario: EscenarioTorneo; faseId: string }> {
  const escenario = await crearTorneoDePrueba({ cupoEquipos: 4 });
  await inscribirEquipos(escenario, 4);

  // Al llenarse el cupo, el torneo ya se cerró solo: avanzar de nuevo
  // sería una transición inválida.
  const { rows } = await obtenerPool().query<{ estado: string }>(
    'SELECT estado FROM torneo WHERE id = $1',
    [escenario.torneoId],
  );
  if (rows[0]!.estado === 'registration_open') {
    await avanzarEstado(
      { torneoId: escenario.torneoId, estadoDestino: 'registration_closed' },
      escenario.titular.contexto,
    );
  }

  return { escenario, faseId: await faseInicial(escenario) };
}

async function partidosDeLaFase(faseId: string): Promise<number> {
  const { rows } = await obtenerPool().query<{ count: string }>(
    'SELECT count(*) FROM partido WHERE fase_id = $1',
    [faseId],
  );
  return Number(rows[0]!.count);
}

describe('confirmarFixture valida la propuesta', () => {
  it('rechaza un equipo que no está inscripto en el torneo', async () => {
    const { escenario, faseId } = await prepararFaseCerrada();
    const propuesta = await generarFixture({ faseId }, escenario.titular.contexto);
    const ajeno = await equipoAjeno(escenario.ciudadId);

    const partidos = propuesta.partidos.map((p, i) =>
      i === 0 ? { ...p, equipoVisitanteId: ajeno } : p,
    );

    await expect(
      confirmarFixture(
        { faseId, partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza un partido de un equipo contra sí mismo', async () => {
    const { escenario, faseId } = await prepararFaseCerrada();
    const propuesta = await generarFixture({ faseId }, escenario.titular.contexto);

    const partidos = propuesta.partidos.map((p, i) =>
      i === 0 ? { ...p, equipoVisitanteId: p.equipoLocalId } : p,
    );

    await expect(
      confirmarFixture(
        { faseId, partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('rechaza una zona que pertenece a otra fase', async () => {
    const { escenario, faseId } = await prepararFaseCerrada();
    const propuesta = await generarFixture({ faseId }, escenario.titular.contexto);

    const otro = await prepararFaseCerrada();
    const { rows: gruposAjenos } = await obtenerPool().query<{ id: string }>(
      'SELECT id FROM grupo WHERE fase_id = $1 LIMIT 1',
      [otro.faseId],
    );
    const grupoAjeno = gruposAjenos[0];
    if (!grupoAjeno) return; // el formato liga puede no tener zonas

    const partidos = propuesta.partidos.map((p, i) =>
      i === 0 ? { ...p, grupoId: grupoAjeno.id } : p,
    );

    await expect(
      confirmarFixture({ faseId, partidos }, escenario.titular.contexto),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  /** Una propuesta inválida no tiene que destruir el fixture que ya estaba. */
  it('una propuesta inválida deja intacto el fixture anterior', async () => {
    const { escenario, faseId } = await prepararFaseCerrada();
    const propuesta = await generarFixture({ faseId }, escenario.titular.contexto);
    await confirmarFixture(
      { faseId, partidos: propuesta.partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
      escenario.titular.contexto,
    );
    const antes = await partidosDeLaFase(faseId);
    expect(antes).toBeGreaterThan(0);

    const ajeno = await equipoAjeno(escenario.ciudadId);
    await expect(
      confirmarFixture(
        {
          faseId,
          partidos: [
            { numeroFecha: 1, equipoLocalId: ajeno, equipoVisitanteId: ajeno, grupoId: null },
          ],
        },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });

    expect(await partidosDeLaFase(faseId)).toBe(antes);
  });

  /**
   * "Torneo sin equipos" y "torneo con un equipo": antes devolvían una
   * propuesta vacía y el error recién aparecía al confirmar, con un
   * mensaje sobre el formato de los datos que no explicaba nada.
   */
  it.each([
    ['sin ningún equipo', 0],
    ['con un solo equipo', 1],
  ])('avisa que faltan rivales %s', async (_caso, cantidad) => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 4 });
    if (cantidad > 0) await inscribirEquipos(escenario, cantidad);
    await avanzarEstado(
      { torneoId: escenario.torneoId, estadoDestino: 'registration_closed' },
      escenario.titular.contexto,
    );
    const faseId = await faseInicial(escenario);

    await expect(generarFixture({ faseId }, escenario.titular.contexto)).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
  });

  it('la propuesta que genera el propio servicio se confirma sin problema', async () => {
    const { escenario, faseId } = await prepararFaseCerrada();
    const propuesta = await generarFixture({ faseId }, escenario.titular.contexto);

    await expect(
      confirmarFixture(
        { faseId, partidos: propuesta.partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
        escenario.titular.contexto,
      ),
    ).resolves.toMatchObject({ partidosCreados: propuesta.partidos.length });
  });
});
