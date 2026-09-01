import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { invitarIntegrante } from '@/services/equipos/invitarIntegrante';
import { solicitarIngreso } from '@/services/equipos/solicitarIngreso';
import { asignarColaborador } from '@/services/organizadores/asignarColaborador';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { seguir } from '@/services/notificaciones/seguir';
import { dejarDeSeguir } from '@/services/notificaciones/dejarDeSeguir';
import { crearTorneoDePrueba, crearUsuarioDePrueba } from './_escenarios';

/**
 * T27 — Seis operaciones documentadas como idempotentes en su propio
 * servicio (`10`, 2.6), representativas de T8/T19/T20/T25: repetir la
 * misma clave no duplica el vínculo ni falla la segunda vez. No es la
 * lista exhaustiva de todo lo idempotente del backlog — es una muestra
 * de cada dominio que la tiene.
 */

async function contarFilas(tabla: string, where: string, valores: unknown[]): Promise<number> {
  const { rows } = await obtenerPool().query<{ n: string }>(
    `SELECT count(*) AS n FROM ${tabla} WHERE ${where}`,
    valores,
  );
  return Number(rows[0]!.n);
}

describe('idempotencia de las claves determinísticas', () => {
  afterAll(async () => {
    await obtenerPool().end();
  });

  it('invitarIntegrante dos veces con el mismo rol no duplica el vínculo (T19)', async () => {
    const capitan = await crearUsuarioDePrueba('Capitán');
    const equipo = await crearEquipo(
      { nombre: `Equipo de prueba ${randomUUID()}`, categoriaGenero: 'mixed' },
      capitan.contexto,
    );
    const invitado = await crearUsuarioDePrueba('Invitado');
    const input = { equipoId: equipo.id, roles: ['player' as const], perfilId: invitado.perfilId };

    await invitarIntegrante(input, capitan.contexto);
    await expect(invitarIntegrante(input, capitan.contexto)).resolves.toBeDefined();

    const filas = await contarFilas(
      'integrante_equipo',
      'equipo_id = $1 AND perfil_id = $2 AND rol_equipo = $3',
      [equipo.id, invitado.perfilId, 'player'],
    );
    expect(filas).toBe(1);
  });

  it('solicitar ingreso dos veces al mismo equipo confirma la solicitud existente (T19)', async () => {
    const capitan = await crearUsuarioDePrueba('Capitán');
    const equipo = await crearEquipo(
      { nombre: `Equipo de prueba ${randomUUID()}`, categoriaGenero: 'mixed' },
      capitan.contexto,
    );
    const aspirante = await crearUsuarioDePrueba('Aspirante');

    await solicitarIngreso({ equipoId: equipo.id }, aspirante.contexto);
    await expect(solicitarIngreso({ equipoId: equipo.id }, aspirante.contexto)).resolves.toEqual({
      estado: 'requested',
    });

    const filas = await contarFilas('integrante_equipo', 'equipo_id = $1 AND perfil_id = $2', [
      equipo.id,
      aspirante.perfilId,
    ]);
    expect(filas).toBe(1);
  });

  it('asignar dos veces al mismo colaborador confirma el vínculo existente (T8)', async () => {
    const escenario = await crearTorneoDePrueba();
    const colaborador = await crearUsuarioDePrueba();
    const input = { torneoId: escenario.torneoId, usuarioId: colaborador.usuarioId };

    await asignarColaborador(input, escenario.titular.contexto);
    await expect(asignarColaborador(input, escenario.titular.contexto)).resolves.toEqual({
      estado: 'active',
    });

    const filas = await contarFilas('colaborador_torneo', 'torneo_id = $1 AND usuario_id = $2', [
      escenario.torneoId,
      colaborador.usuarioId,
    ]);
    expect(filas).toBe(1);
  });

  it('solicitar la misma inscripción dos veces confirma la existente, sin duplicarla (T20)', async () => {
    const escenario = await crearTorneoDePrueba();
    const capitan = await crearUsuarioDePrueba('Capitán');
    const equipo = await crearEquipo(
      { nombre: `Equipo de prueba ${randomUUID()}`, categoriaGenero: 'mixed' },
      capitan.contexto,
    );
    const input = { torneoId: escenario.torneoId, equipoId: equipo.id };

    const primera = await solicitarInscripcion(input, capitan.contexto);
    const segunda = await solicitarInscripcion(input, capitan.contexto);
    expect(segunda.estado).toBe(primera.estado);

    const filas = await contarFilas('inscripcion', 'torneo_id = $1 AND equipo_id = $2', [
      escenario.torneoId,
      equipo.id,
    ]);
    expect(filas).toBe(1);
  });

  it('seguir dos veces lo mismo no duplica ni falla (T25)', async () => {
    const escenario = await crearTorneoDePrueba();
    const persona = await crearUsuarioDePrueba();
    const input = { tipoSeguido: 'tournament' as const, entidadId: escenario.torneoId };

    await seguir(input, persona.contexto);
    await expect(seguir(input, persona.contexto)).resolves.toEqual({ siguiendo: true });

    const filas = await contarFilas(
      'seguimiento',
      'usuario_id = $1 AND tipo_seguido = $2 AND entidad_seguida_id = $3',
      [persona.usuarioId, 'tournament', escenario.torneoId],
    );
    expect(filas).toBe(1);
  });

  it('dejar de seguir algo que ya no se sigue no falla (T25)', async () => {
    const escenario = await crearTorneoDePrueba();
    const persona = await crearUsuarioDePrueba();
    const input = { tipoSeguido: 'tournament' as const, entidadId: escenario.torneoId };

    await dejarDeSeguir(input, persona.contexto);
    await expect(dejarDeSeguir(input, persona.contexto)).resolves.toEqual({ siguiendo: false });
  });
});
