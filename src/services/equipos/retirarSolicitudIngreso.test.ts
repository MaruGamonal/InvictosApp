import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: { perfilId?: string | null; rowCountUpdate?: number }) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('FROM perfil_deportivo')) {
          return { rows: opciones.perfilId ? [{ id: opciones.perfilId }] : [] };
        }
        if (texto.startsWith('UPDATE integrante_equipo')) {
          return { rowCount: opciones.rowCountUpdate ?? 1 };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('retirarSolicitudIngreso', () => {
  it('retira la solicitud propia, que queda cancelled', async () => {
    mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111' });
    const { retirarSolicitudIngreso } = await import('./retirarSolicitudIngreso');
    await expect(
      retirarSolicitudIngreso(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).resolves.toEqual({ estado: 'cancelled' });
  });

  it('sin solicitud pendiente que retirar, NO_ENCONTRADO', async () => {
    mockearDb({ perfilId: '21111111-1111-1111-1111-111111111111', rowCountUpdate: 0 });
    const { retirarSolicitudIngreso } = await import('./retirarSolicitudIngreso');
    await expect(
      retirarSolicitudIngreso(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { retirarSolicitudIngreso } = await import('./retirarSolicitudIngreso');
    await expect(
      retirarSolicitudIngreso(
        { equipoId: '11111111-1111-1111-1111-111111111111' },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
