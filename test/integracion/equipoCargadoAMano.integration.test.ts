import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { inscribirEquipoManual } from '@/services/inscripciones/inscribirEquipoManual';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { crearTorneoDePrueba, inscribirEquipos } from './_escenarios';

/**
 * UC-26 — El organizador carga un equipo a mano.
 *
 * El servicio existía y estaba probado desde T20, pero ninguna pantalla
 * lo alcanzaba: sólo se podía invocar desde sus propios tests. Ahora que
 * hay pantalla, esto verifica contra Postgres lo que un mock no puede —
 * que el equipo nazca sin capitán (reclamable después, D-29b), que la
 * inscripción nazca aprobada sin pasar por `pending`, y que el cupo se
 * respete de verdad.
 */
describe('cargar un equipo a mano', () => {
  it('crea el equipo sin capitán y lo deja inscripto en un paso', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 8 });
    const nombre = `Equipo a mano ${randomUUID().slice(0, 8)}`;

    const resultado = await inscribirEquipoManual(
      { torneoId: escenario.torneoId, nombre, categoriaGenero: 'mixed' },
      escenario.titular.contexto,
    );

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    const inscripcion = gestion.inscripciones.find((i) => i.equipoId === resultado.equipoId);
    // Aprobada de entrada: el organizador ya decidió, no se pide a sí
    // mismo permiso para lo que acaba de hacer.
    expect(inscripcion).toMatchObject({ nombreEquipo: nombre, estado: 'approved' });

    // Sin capitán: el equipo queda reclamable, como un perfil de jugador
    // cargado por otro (`06`, D-29b).
    const { rows } = await obtenerPool().query<{ cantidad: string }>(
      `SELECT count(*) AS cantidad FROM integrante_equipo
       WHERE equipo_id = $1 AND rol_equipo = 'captain'`,
      [resultado.equipoId],
    );
    expect(Number(rows[0]!.cantidad)).toBe(0);
  });

  /**
   * Al completarse el cupo, `cerrarTorneoSiCupoCompleto` pasa el torneo
   * a `registration_closed` solo. Así que el equipo número tres no
   * choca con el cupo sino con las inscripciones ya cerradas — que es
   * lo mismo contado desde el lugar correcto, y es también por qué el
   * panel de carga a mano desaparece de la pantalla en ese momento: se
   * muestra sólo con las inscripciones abiertas.
   */
  it('con el cupo completo el torneo ya cerró inscripciones, y no entra', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 2 });
    await inscribirEquipos(escenario, 2);

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    expect(gestion.estado).toBe('registration_closed');

    await expect(
      inscribirEquipoManual(
        { torneoId: escenario.torneoId, nombre: 'Uno más', categoriaGenero: 'mixed' },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'INSCRIPCIONES_CERRADAS' });
  });

  /** Dos inscripciones del mismo equipo en el mismo torneo no tienen sentido. */
  it('no inscribe dos veces al mismo equipo', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 8 });
    const [primero] = await inscribirEquipos(escenario, 1);

    await expect(
      inscribirEquipoManual(
        { torneoId: escenario.torneoId, equipoId: primero!.equipoId },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
