import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

describe('configurarVisibilidad', () => {
  it('es binaria: pública o restringida', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 1 }) }),
    }));
    const { configurarVisibilidad } = await import('./configurarVisibilidad');
    await expect(
      configurarVisibilidad({ visibilidad: 'restricted' }, contextoCon('usuario-1')),
    ).resolves.toEqual({ visibilidad: 'restricted' });
    vi.doUnmock('@/db/cliente');
  });

  it('rechaza un valor que no sea public ni restricted', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { configurarVisibilidad } = await import('./configurarVisibilidad');
    await expect(
      // @ts-expect-error entrada deliberadamente inválida
      configurarVisibilidad({ visibilidad: 'secreto' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    vi.doUnmock('@/db/cliente');
  });
});
