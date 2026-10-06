import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { buscarTorneos } from '@/services/descubrimiento/buscarTorneos';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';
import { confirmarVerificacionesPendientes } from '@/services/organizadores/confirmarVerificacionesPendientes';
import { crearTorneoDePrueba } from './_escenarios';

/**
 * Reportado en vivo: la organización se verificaba y sus torneos seguían
 * sin aparecer en las búsquedas.
 *
 * `publicarTorneo` fija la visibilidad **en el momento de publicar**
 * (`06`, D-51) y nada la volvía a mirar después, así que un torneo
 * publicado antes de la verificación quedaba `unlisted` para siempre —
 * accesible por su link, invisible en el descubrimiento (D-21b).
 *
 * Esto se prueba contra Postgres real y de punta a punta —publicar, no
 * encontrarlo, verificar, encontrarlo— porque el bug no estaba en
 * ninguna de las dos mitades sino en que nadie las unía: con la base
 * simulada se puede afirmar que el UPDATE se ejecuta, pero no que el
 * torneo efectivamente aparece en la búsqueda.
 */
describe('verificar la organización mete sus torneos en el descubrimiento', () => {
  it('el torneo publicado sin verificación aparece recién después de verificar', async () => {
    const escenario = await crearTorneoDePrueba();

    const antes = await buscarTorneos({ ciudadId: escenario.ciudadId }, escenario.titular.contexto);
    expect(antes.torneos.map((t) => t.id)).not.toContain(escenario.torneoId);

    await confirmarVerificacionBasica(
      { organizacionId: escenario.organizacionId },
      escenario.titular.contexto,
    );

    const despues = await buscarTorneos(
      { ciudadId: escenario.ciudadId },
      escenario.titular.contexto,
    );
    expect(despues.torneos.map((t) => t.id)).toContain(escenario.torneoId);
    expect(despues.torneos.find((t) => t.id === escenario.torneoId)?.organizacionVerificada).toBe(
      true,
    );
  });

  /** El otro camino de vuelta del correo (`confirmarVerificacionesPendientes`) hace lo mismo. */
  it('también por el camino del pedido pendiente', async () => {
    const escenario = await crearTorneoDePrueba();

    // El pedido se deja marcado a mano y no con `solicitarVerificacionBasica`:
    // ese servicio manda el correo por Supabase, que acá no hay. Lo que se
    // prueba es el camino de vuelta, que es donde estaba el bug.
    await obtenerPool().query(
      'UPDATE organizacion SET verificacion_solicitada_en = now() WHERE id = $1',
      [escenario.organizacionId],
    );

    const aplicadas = await confirmarVerificacionesPendientes(
      undefined,
      escenario.titular.contexto,
    );
    expect(aplicadas.map((o) => o.organizacionId)).toContain(escenario.organizacionId);

    const despues = await buscarTorneos(
      { ciudadId: escenario.ciudadId },
      escenario.titular.contexto,
    );
    expect(despues.torneos.map((t) => t.id)).toContain(escenario.torneoId);
  });

  /**
   * Un borrador no se publica por la puerta de atrás: nace `unlisted` y
   * es `publicarTorneo` quien decide su visibilidad.
   */
  it('no publica un borrador de la misma organización', async () => {
    const escenario = await crearTorneoDePrueba();
    const pool = obtenerPool();

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO torneo (organizacion_id, nombre, modalidad, categoria_genero, ciudad_id, formato, cupo_equipos, estado)
       VALUES ($1, 'Borrador de prueba', 'f5', 'mixed', $2, 'league', 8, 'draft')
       RETURNING id`,
      [escenario.organizacionId, escenario.ciudadId],
    );
    const borradorId = rows[0]!.id;

    await confirmarVerificacionBasica(
      { organizacionId: escenario.organizacionId },
      escenario.titular.contexto,
    );

    const { rows: despues } = await pool.query<{ visibilidad: string; estado: string }>(
      'SELECT visibilidad, estado FROM torneo WHERE id = $1',
      [borradorId],
    );
    expect(despues[0]).toMatchObject({ visibilidad: 'unlisted', estado: 'draft' });
  });
});
