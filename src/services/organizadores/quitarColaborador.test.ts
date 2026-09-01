import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const TORNEO = '11111111-1111-1111-1111-111111111111';
const ORG = '22222222-2222-2222-2222-222222222222';
const COLABORADOR = '33333333-3333-3333-3333-333333333333';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { rolEnOrganizacion?: 'owner' | 'admin'; rowCountUpdate?: number }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM torneo WHERE id')) {
          return { rows: [{ organizacion_id: ORG }] };
        }
        if (texto.includes('FROM miembro_organizacion')) {
          return { rows: opciones.rolEnOrganizacion ? [{ rol: opciones.rolEnOrganizacion }] : [] };
        }
        if (texto.includes('FROM colaborador_torneo')) {
          return { rows: [] };
        }
        if (texto.startsWith('UPDATE colaborador_torneo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('quitarColaborador', () => {
  it('el titular quita a un colaborador; el vínculo pasa a removed, no se borra', async () => {
    mockearDb({ rolEnOrganizacion: 'owner' });
    const { quitarColaborador } = await import('./quitarColaborador');
    await expect(
      quitarColaborador(
        { torneoId: TORNEO, usuarioId: COLABORADOR },
        contextoCon('usuario-titular'),
      ),
    ).resolves.toEqual({ estado: 'removed' });
  });

  it('sin colaborador activo para quitar, NO_ENCONTRADO', async () => {
    mockearDb({ rolEnOrganizacion: 'owner', rowCountUpdate: 0 });
    const { quitarColaborador } = await import('./quitarColaborador');
    await expect(
      quitarColaborador(
        { torneoId: TORNEO, usuarioId: COLABORADOR },
        contextoCon('usuario-titular'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('un colaborador no puede quitar a otro colaborador', async () => {
    mockearDb({});
    const { quitarColaborador } = await import('./quitarColaborador');
    await expect(
      quitarColaborador({ torneoId: TORNEO, usuarioId: COLABORADOR }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
