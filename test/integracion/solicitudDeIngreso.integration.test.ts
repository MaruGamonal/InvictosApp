import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { solicitarIngreso } from '@/services/equipos/solicitarIngreso';
import { retirarSolicitudIngreso } from '@/services/equipos/retirarSolicitudIngreso';
import { obtenerMiRolEnEquipo } from '@/services/equipos/obtenerMiRolEnEquipo';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { crearCiudadDePrueba, crearUsuarioDePrueba } from './_escenarios';

/**
 * UC-53 — Pedir sumarse a un equipo, y echarse atrás.
 *
 * `retirarSolicitudIngreso` existía desde T19 con su ruta, y no lo
 * llamaba ninguna pantalla: se podía pedir y no cancelar. Y la ficha
 * tampoco sabía que había un pedido pendiente, así que al recargar
 * volvía a ofrecer "Pedir sumarme" como si nada.
 */
async function escenario() {
  const capitan = await crearUsuarioDePrueba('Capitana');
  const aspirante = await crearUsuarioDePrueba('Aspirante');
  const ciudadId = await crearCiudadDePrueba();
  const equipo = await crearEquipo(
    { nombre: `Equipo ${Date.now()}`, categoriaGenero: 'mixed', ciudadId },
    capitan.contexto,
  );
  return { aspirante, equipoId: equipo.id };
}

describe('la solicitud de ingreso a un equipo', () => {
  it('queda pendiente, se ve como pendiente, y se puede retirar', async () => {
    const { aspirante, equipoId } = await escenario();

    // Antes de pedir: ni rol ni solicitud.
    const antes = await obtenerMiRolEnEquipo({ equipoId }, aspirante.contexto);
    expect(antes).toMatchObject({ roles: [], solicitudPendiente: false });

    await solicitarIngreso({ equipoId }, aspirante.contexto);

    // Pedir no da ningún rol: todavía no es parte del equipo.
    const pedido = await obtenerMiRolEnEquipo({ equipoId }, aspirante.contexto);
    expect(pedido.roles).toEqual([]);
    expect(pedido.solicitudPendiente).toBe(true);

    await retirarSolicitudIngreso({ equipoId }, aspirante.contexto);

    const retirado = await obtenerMiRolEnEquipo({ equipoId }, aspirante.contexto);
    expect(retirado.solicitudPendiente).toBe(false);

    // Queda `cancelled` y no borrado: quien propuso se echó atrás, y eso
    // es parte de la historia del vínculo.
    const { rows } = await obtenerPool().query<{ estado_vinculo: string }>(
      `SELECT estado_vinculo FROM integrante_equipo
       WHERE equipo_id = $1 AND perfil_id = $2`,
      [equipoId, aspirante.perfilId],
    );
    expect(rows[0]?.estado_vinculo).toBe('cancelled');
  });

  it('retirada, se puede volver a pedir', async () => {
    const { aspirante, equipoId } = await escenario();
    await solicitarIngreso({ equipoId }, aspirante.contexto);
    await retirarSolicitudIngreso({ equipoId }, aspirante.contexto);

    await expect(solicitarIngreso({ equipoId }, aspirante.contexto)).resolves.toBeDefined();
    const despues = await obtenerMiRolEnEquipo({ equipoId }, aspirante.contexto);
    expect(despues.solicitudPendiente).toBe(true);
  });

  it('sin solicitud pendiente, retirar no encuentra nada que retirar', async () => {
    const { aspirante, equipoId } = await escenario();
    await expect(retirarSolicitudIngreso({ equipoId }, aspirante.contexto)).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
