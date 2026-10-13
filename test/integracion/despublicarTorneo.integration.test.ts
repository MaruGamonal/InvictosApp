import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { buscarTorneos } from '@/services/descubrimiento/buscarTorneos';
import { obtenerFichaTorneo } from '@/services/descubrimiento/obtenerFichaTorneo';
import { despublicarTorneo } from '@/services/torneos/despublicarTorneo';
import { cambiarVisibilidadTorneo } from '@/services/torneos/cambiarVisibilidadTorneo';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';
import { crearTorneoDePrueba, inscribirEquipos } from './_escenarios';

/**
 * Publicar era de ida. Un torneo publicado de prueba, o por error, se
 * quedaba publicado para siempre: lo único parecido era cancelarlo, que
 * es definitivo y encima lo deja a la vista con el cartel de cancelado.
 *
 * Esto se prueba de punta a punta porque lo que hay que verificar no es
 * que una columna cambie sino que el torneo **efectivamente deje de
 * aparecer** en la búsqueda — y, en el caso de sacarlo de las
 * búsquedas, que la ficha siga sirviéndose completa por link.
 */
async function escenarioPublicadoYVisible() {
  const escenario = await crearTorneoDePrueba();
  await confirmarVerificacionBasica(
    { organizacionId: escenario.organizacionId },
    escenario.titular.contexto,
  );
  const busqueda = await buscarTorneos({ ciudadId: escenario.ciudadId }, CONTEXTO_PUBLICO);
  expect(busqueda.torneos.map((t) => t.id)).toContain(escenario.torneoId);
  return escenario;
}

describe('despublicar un torneo', () => {
  it('sin equipos, vuelve a borrador y desaparece de las búsquedas', async () => {
    const escenario = await escenarioPublicadoYVisible();

    await despublicarTorneo({ torneoId: escenario.torneoId }, escenario.titular.contexto);

    const { rows } = await obtenerPool().query<{ estado: string; visibilidad: string }>(
      'SELECT estado, visibilidad FROM torneo WHERE id = $1',
      [escenario.torneoId],
    );
    expect(rows[0]).toMatchObject({ estado: 'draft', visibilidad: 'unlisted' });

    const despues = await buscarTorneos({ ciudadId: escenario.ciudadId }, CONTEXTO_PUBLICO);
    expect(despues.torneos.map((t) => t.id)).not.toContain(escenario.torneoId);

    // Y como borrador, deja de verse incluso por link directo.
    await expect(
      obtenerFichaTorneo({ torneoId: escenario.torneoId }, CONTEXTO_PUBLICO),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('con equipos anotados, no se puede: el torneo les desaparecería', async () => {
    const escenario = await escenarioPublicadoYVisible();
    await inscribirEquipos(escenario, 1);

    await expect(
      despublicarTorneo({ torneoId: escenario.torneoId }, escenario.titular.contexto),
    ).rejects.toMatchObject({ codigo: 'TORNEO_YA_TIENE_EQUIPOS' });
  });
});

describe('sacar un torneo de las búsquedas', () => {
  /**
   * La salida para un torneo que ya tiene equipos: no le saca nada a
   * nadie, sólo deja de aparecer en el descubrimiento (D-21b).
   */
  it('lo saca de la búsqueda pero la ficha sigue sirviéndose por link', async () => {
    const escenario = await escenarioPublicadoYVisible();
    await inscribirEquipos(escenario, 1);

    await cambiarVisibilidadTorneo(
      { torneoId: escenario.torneoId, visibilidad: 'unlisted' },
      escenario.titular.contexto,
    );

    const despues = await buscarTorneos({ ciudadId: escenario.ciudadId }, CONTEXTO_PUBLICO);
    expect(despues.torneos.map((t) => t.id)).not.toContain(escenario.torneoId);

    // Lo que lo distingue de volver a borrador: sigue estando.
    const ficha = await obtenerFichaTorneo({ torneoId: escenario.torneoId }, CONTEXTO_PUBLICO);
    expect(ficha.estado).toBe('registration_open');
    expect(ficha.equiposInscriptos).toHaveLength(1);

    // Y vuelve.
    await cambiarVisibilidadTorneo(
      { torneoId: escenario.torneoId, visibilidad: 'public' },
      escenario.titular.contexto,
    );
    const final = await buscarTorneos({ ciudadId: escenario.ciudadId }, CONTEXTO_PUBLICO);
    expect(final.torneos.map((t) => t.id)).toContain(escenario.torneoId);
  });
});
