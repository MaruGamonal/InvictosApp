import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

/**
 * Las dos consultas de vínculo van a la misma tabla y se distinguen por
 * `estado_vinculo`: `active` son los roles, `requested` es el pedido sin
 * responder. El mock las separa por eso y no por el orden en que se
 * hacen, porque se hacen en paralelo (`Promise.all`).
 */
function mockearDb(opciones: { perfilId?: string; roles?: string[]; solicitud?: boolean }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (sql.includes("'requested'")) {
          return { rows: opciones.solicitud ? [{ '?column?': 1 }] : [] };
        }
        return { rows: (opciones.roles ?? []).map((rol_equipo) => ({ rol_equipo })) };
      },
    }),
  }));
}

async function pedirMiRol(usuarioId: string | null) {
  const { obtenerMiRolEnEquipo } = await import('./obtenerMiRolEnEquipo');
  return obtenerMiRolEnEquipo(
    { equipoId: '11111111-1111-1111-1111-111111111111' },
    contextoCon(usuarioId),
  );
}

describe('obtenerMiRolEnEquipo', () => {
  it('sin sesión, sin roles y sin error (no es una acción, es un dato de lectura)', async () => {
    mockearDb({});
    expect(await pedirMiRol(null)).toEqual({
      roles: [],
      perfilId: null,
      solicitudPendiente: false,
    });
  });

  it('con sesión pero sin perfil deportivo, sin roles', async () => {
    mockearDb({});
    expect(await pedirMiRol('usuario-1')).toEqual({
      roles: [],
      perfilId: null,
      solicitudPendiente: false,
    });
  });

  it('con sesión y perfil, pero sin vínculo activo con el equipo, sin roles pero con perfilId', async () => {
    mockearDb({ perfilId: 'perfil-1', roles: [] });
    expect(await pedirMiRol('usuario-1')).toEqual({
      roles: [],
      perfilId: 'perfil-1',
      solicitudPendiente: false,
    });
  });

  it('con vínculo activo, devuelve los roles y el perfilId', async () => {
    mockearDb({ perfilId: 'perfil-1', roles: ['captain'] });
    expect(await pedirMiRol('usuario-1')).toEqual({
      roles: ['captain'],
      perfilId: 'perfil-1',
      solicitudPendiente: false,
    });
  });

  it('con un pedido de ingreso sin responder, lo informa sin inventar un rol', async () => {
    mockearDb({ perfilId: 'perfil-1', roles: [], solicitud: true });
    expect(await pedirMiRol('usuario-1')).toEqual({
      roles: [],
      perfilId: 'perfil-1',
      solicitudPendiente: true,
    });
  });
});
