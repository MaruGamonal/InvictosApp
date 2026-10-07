import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { agregarDivision } from '@/services/torneos/agregarDivision';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';
import { crearTorneoDePrueba } from './_escenarios';

/**
 * `agregarDivision` copia casi todas las columnas del torneo de origen,
 * y eso está bien: la división nueva es el mismo torneo con otra
 * categoría. Pero `visibilidad` no es una propiedad del torneo en ese
 * sentido — la decide `publicarTorneo` según la verificación de la
 * organización (`06`, D-51), y la división nueva todavía no se publicó.
 *
 * Copiándola, una división de un torneo publicado nacía `draft` +
 * `public`: un estado que no produce ninguna otra parte del código. Hoy
 * no se filtra a ningún lado porque el descubrimiento también mira el
 * estado, pero alcanza con una consulta futura que mire solo
 * `visibilidad` para que un borrador se vuelva público.
 */
describe('la división nueva no hereda la visibilidad del torneo publicado', () => {
  it('nace en borrador y no listada, aunque el origen esté publicado y público', async () => {
    const escenario = await crearTorneoDePrueba();
    await confirmarVerificacionBasica(
      { organizacionId: escenario.organizacionId },
      escenario.titular.contexto,
    );

    const pool = obtenerPool();
    const { rows: origen } = await pool.query<{ estado: string; visibilidad: string }>(
      'SELECT estado, visibilidad FROM torneo WHERE id = $1',
      [escenario.torneoId],
    );
    // El punto de partida: el origen está publicado y es público.
    expect(origen[0]).toMatchObject({ estado: 'registration_open', visibilidad: 'public' });

    const nueva = await agregarDivision(
      {
        torneoIdOrigen: escenario.torneoId,
        division: `Division B ${randomUUID().slice(0, 8)}`,
        nombreCertamen: `Certamen ${randomUUID().slice(0, 8)}`,
        divisionOrigen: 'Division A',
      },
      escenario.titular.contexto,
    );

    const { rows } = await pool.query<{ estado: string; visibilidad: string }>(
      'SELECT estado, visibilidad FROM torneo WHERE id = $1',
      [nueva.id],
    );
    expect(rows[0]).toMatchObject({ estado: 'draft', visibilidad: 'unlisted' });
  });
});
