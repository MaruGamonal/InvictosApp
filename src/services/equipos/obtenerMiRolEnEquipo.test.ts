import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { perfilId?: string; roles?: string[] }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (sql: string) => {
        if (sql.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        return { rows: (opciones.roles ?? []).map((rol_equipo) => ({ rol_equipo })) };
      },
    }),
  }));
}

describe('obtenerMiRolEnEquipo', () => {
  it('sin sesión, sin roles y sin error (no es una acción, es un dato de lectura)', async () => {
    mockearDb({});
    const { obtenerMiRolEnEquipo } = await import('./obtenerMiRolEnEquipo');
    const resultado = await obtenerMiRolEnEquipo(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon(null),
    );
    expect(resultado).toEqual({ roles: [], perfilId: null });
  });

  it('con sesión pero sin perfil deportivo, sin roles', async () => {
    mockearDb({});
    const { obtenerMiRolEnEquipo } = await import('./obtenerMiRolEnEquipo');
    const resultado = await obtenerMiRolEnEquipo(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({ roles: [], perfilId: null });
  });

  it('con sesión y perfil, pero sin vínculo activo con el equipo, sin roles pero con perfilId', async () => {
    mockearDb({ perfilId: 'perfil-1', roles: [] });
    const { obtenerMiRolEnEquipo } = await import('./obtenerMiRolEnEquipo');
    const resultado = await obtenerMiRolEnEquipo(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({ roles: [], perfilId: 'perfil-1' });
  });

  it('con vínculo activo, devuelve los roles y el perfilId', async () => {
    mockearDb({ perfilId: 'perfil-1', roles: ['captain'] });
    const { obtenerMiRolEnEquipo } = await import('./obtenerMiRolEnEquipo');
    const resultado = await obtenerMiRolEnEquipo(
      { equipoId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({ roles: ['captain'], perfilId: 'perfil-1' });
  });
});
