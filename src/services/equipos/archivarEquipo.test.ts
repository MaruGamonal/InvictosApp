import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  perfilId?: string | null;
  rolesEnEquipo?: string[];
  enTorneoEnCurso?: boolean;
  rowCountUpdate?: number;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.includes('FROM integrante_equipo')) {
          return { rows: (opciones.rolesEnEquipo ?? []).map((rol_equipo) => ({ rol_equipo })) };
        }
        if (texto.includes('FROM inscripcion')) {
          return { rows: opciones.enTorneoEnCurso ? [{}] : [] };
        }
        if (texto.startsWith('UPDATE equipo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('archivarEquipo', () => {
  it('el capitán archiva el equipo', async () => {
    mockearDb({ perfilId: '22222222-2222-2222-2222-222222222222', rolesEnEquipo: ['captain'] });
    const { archivarEquipo } = await import('./archivarEquipo');
    await expect(
      archivarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ id: '11111111-1111-1111-1111-111111111111' });
  });

  it('un delegado no puede archivar (exclusivo del capitán)', async () => {
    mockearDb({ perfilId: '33333333-3333-3333-3333-333333333333', rolesEnEquipo: ['delegate'] });
    const { archivarEquipo } = await import('./archivarEquipo');
    await expect(
      archivarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('no se puede archivar mientras compite en un torneo en curso (D-68)', async () => {
    mockearDb({
      perfilId: '22222222-2222-2222-2222-222222222222',
      rolesEnEquipo: ['captain'],
      enTorneoEnCurso: true,
    });
    const { archivarEquipo } = await import('./archivarEquipo');
    await expect(
      archivarEquipo(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'EQUIPO_EN_TORNEO_EN_CURSO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { archivarEquipo } = await import('./archivarEquipo');
    await expect(
      archivarEquipo({ equipoId: '11111111-1111-1111-1111-111111111111' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
