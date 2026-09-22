import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { obtenerPool } from '@/db/cliente';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { resolverInscripcion } from '@/services/inscripciones/resolverInscripcion';
import {
  crearTorneoDePrueba,
  crearUsuarioDePrueba,
  inscribirEquipos,
  type EscenarioTorneo,
} from './_escenarios';

/**
 * El invariante es "equipos aprobados ≤ cupo del torneo". El producto lo
 * declara por los dos lados —`CUPO_COMPLETO` al inscribirse y
 * `CUPO_MENOR_A_INSCRIPTOS` al bajar el cupo— pero aprobar no lo
 * comprobaba: con el torneo lleno y solicitudes todavía pendientes,
 * aprobar una más entraba igual.
 *
 * Se prueba contra Postgres real porque la mitad interesante es la
 * concurrencia: dos organizadores aprobando a la vez leían los dos el
 * mismo lugar libre. Eso solo se ve con transacciones de verdad.
 */

/** Deja una solicitud `pending` sin resolver, para aprobarla después. */
async function solicitarSinResolver(escenario: EscenarioTorneo): Promise<string> {
  const capitan = await crearUsuarioDePrueba(`Capitán extra ${randomUUID()}`);
  const equipo = await crearEquipo(
    {
      nombre: `Equipo extra ${randomUUID()}`,
      categoriaGenero: 'mixed',
      ciudadId: escenario.ciudadId,
    },
    capitan.contexto,
  );
  await solicitarInscripcion(
    { torneoId: escenario.torneoId, equipoId: equipo.id },
    capitan.contexto,
  );
  return equipo.id;
}

async function aprobados(torneoId: string): Promise<number> {
  const { rows } = await obtenerPool().query<{ count: string }>(
    `SELECT count(*) FROM inscripcion WHERE torneo_id = $1 AND estado = 'approved'`,
    [torneoId],
  );
  return Number(rows[0]!.count);
}

describe('el cupo del torneo no se puede superar aprobando', () => {
  it('con el cupo lleno, aprobar una solicitud pendiente se rechaza', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 2 });
    await inscribirEquipos(escenario, 2);
    // El torneo se cerró solo al llenarse; se reabre para poder dejar
    // una solicitud pendiente, que es el estado que produce el problema.
    await obtenerPool().query(`UPDATE torneo SET estado = 'registration_open' WHERE id = $1`, [
      escenario.torneoId,
    ]);
    const extra = await solicitarSinResolver(escenario);

    expect(await aprobados(escenario.torneoId)).toBe(2);

    await expect(
      resolverInscripcion(
        { torneoId: escenario.torneoId, equipoId: extra, decision: 'approved' },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'CUPO_COMPLETO' });

    expect(await aprobados(escenario.torneoId)).toBe(2);
  });

  it('rechazar sigue funcionando con el cupo lleno', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 2 });
    await inscribirEquipos(escenario, 2);
    await obtenerPool().query(`UPDATE torneo SET estado = 'registration_open' WHERE id = $1`, [
      escenario.torneoId,
    ]);
    const extra = await solicitarSinResolver(escenario);

    await expect(
      resolverInscripcion(
        {
          torneoId: escenario.torneoId,
          equipoId: extra,
          decision: 'rejected',
          motivo: 'roster_incomplete',
        },
        escenario.titular.contexto,
      ),
    ).resolves.toEqual({ estado: 'rejected' });
  });

  /**
   * La prueba que justifica el `FOR UPDATE`: con una sola vacante y dos
   * aprobaciones disparadas juntas, una tiene que entrar y la otra
   * rebotar. Sin el bloqueo las dos leían "queda una" y entraban ambas.
   */
  it('dos aprobaciones simultáneas por la última vacante: entra una sola', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 3 });
    await inscribirEquipos(escenario, 2);
    await obtenerPool().query(`UPDATE torneo SET estado = 'registration_open' WHERE id = $1`, [
      escenario.torneoId,
    ]);
    const primero = await solicitarSinResolver(escenario);
    const segundo = await solicitarSinResolver(escenario);

    const resultados = await Promise.allSettled([
      resolverInscripcion(
        { torneoId: escenario.torneoId, equipoId: primero, decision: 'approved' },
        escenario.titular.contexto,
      ),
      resolverInscripcion(
        { torneoId: escenario.torneoId, equipoId: segundo, decision: 'approved' },
        escenario.titular.contexto,
      ),
    ]);

    const cumplidas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r) => r.status === 'rejected');

    expect(cumplidas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0]).toMatchObject({ reason: { codigo: 'CUPO_COMPLETO' } });
    expect(await aprobados(escenario.torneoId)).toBe(3);
  });
});
