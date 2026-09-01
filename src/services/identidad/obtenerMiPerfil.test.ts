import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

describe('obtenerMiPerfil', () => {
  it('devuelve el perfil propio', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async () => ({
          rows: [
            {
              id: 'perfil-1',
              nombre_visible: 'Juan',
              foto_url: null,
              posicion: null,
              ciudad_id: null,
              visibilidad: 'public',
              estado_reclamo: 'claimed',
            },
          ],
        }),
      }),
    }));
    const { obtenerMiPerfil } = await import('./obtenerMiPerfil');
    const perfil = await obtenerMiPerfil(undefined, contextoCon('usuario-1'));
    expect(perfil.nombreVisible).toBe('Juan');
    vi.doUnmock('@/db/cliente');
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { obtenerMiPerfil } = await import('./obtenerMiPerfil');
    await expect(obtenerMiPerfil(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
    vi.doUnmock('@/db/cliente');
  });
});
