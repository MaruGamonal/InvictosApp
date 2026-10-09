import { describe, expect, it } from 'vitest';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { actualizarTorneo } from '@/services/torneos/actualizarTorneo';
import { crearTorneoDePrueba } from './_escenarios';

/**
 * Las reglas de competencia salen de diez columnas que `obtenerGestionTorneo`
 * pide por nombre. Un nombre equivocado es un error de SQL que ningún
 * test con la base simulada puede ver —el mock responde a cualquier
 * consulta— y que en producción tira la pantalla entera de gestión, no
 * sólo la sección de reglas.
 *
 * Y de paso cierra el ida y vuelta: lo que el formulario guarda es lo
 * que la pantalla vuelve a leer.
 */
describe('las reglas del torneo contra el esquema real', () => {
  it('trae los valores por defecto del esquema', async () => {
    const escenario = await crearTorneoDePrueba();
    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );

    expect(gestion.reglas).toMatchObject({
      puntosVictoria: 3,
      puntosEmpate: 1,
      puntosDerrota: 0,
      soloOrganizadorCargaResultados: false,
      partidosPendientesPorAbandono: 'ganados_por_rival',
      golesWalkoverGanador: 3,
      golesWalkoverPerdedor: 0,
      fechaCierreListaBuenaFe: null,
    });
    // Las dos columnas son nullable y sin valor por defecto: un torneo
    // recién creado no tiene tope de plantel hasta que se lo pongan.
    expect(gestion.reglas.minJugadoresLista).toBeNull();
    expect(gestion.reglas.maxJugadoresLista).toBeNull();
    expect(typeof gestion.reglas.jugadorUnicoPorEquipo).toBe('boolean');
  });

  it('lo que se guarda es lo que se vuelve a leer', async () => {
    const escenario = await crearTorneoDePrueba();
    const cierre = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    await actualizarTorneo(
      {
        torneoId: escenario.torneoId,
        puntosVictoria: 2,
        puntosEmpate: 1,
        puntosDerrota: 0,
        soloOrganizadorCargaResultados: true,
        partidosPendientesPorAbandono: 'anulados',
        golesWalkoverGanador: 1,
        golesWalkoverPerdedor: 0,
        maxJugadoresLista: 25,
        fechaCierreListaBuenaFe: cierre,
      },
      escenario.titular.contexto,
    );

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );

    expect(gestion.reglas).toMatchObject({
      puntosVictoria: 2,
      soloOrganizadorCargaResultados: true,
      partidosPendientesPorAbandono: 'anulados',
      golesWalkoverGanador: 1,
      maxJugadoresLista: 25,
    });
    expect(gestion.reglas.fechaCierreListaBuenaFe).toBe(cierre);
  });
});
