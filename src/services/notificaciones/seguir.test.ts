import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

describe('seguir', () => {
  it('sigue un torneo', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 1 }) }),
    }));
    const { seguir } = await import('./seguir');
    await expect(
      seguir(
        { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('77777777-7777-7777-7777-777777777777'),
      ),
    ).resolves.toEqual({ siguiendo: true });
  });

  it('al seguir un torneo, invalida su ficha cacheada (el conteo de seguidores vive ahí)', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 1 }) }),
    }));
    const invalidarCacheTorneo = vi.fn();
    const invalidarCacheEquipo = vi.fn();
    vi.doMock('@/lib/cache', () => ({ invalidarCacheTorneo, invalidarCacheEquipo }));
    const { seguir } = await import('./seguir');
    await seguir(
      { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
      contextoCon('77777777-7777-7777-7777-777777777777'),
    );
    expect(invalidarCacheTorneo).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(invalidarCacheEquipo).not.toHaveBeenCalled();
  });

  it('al seguir un equipo, invalida su perfil cacheado', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 1 }) }),
    }));
    const invalidarCacheTorneo = vi.fn();
    const invalidarCacheEquipo = vi.fn();
    vi.doMock('@/lib/cache', () => ({ invalidarCacheTorneo, invalidarCacheEquipo }));
    const { seguir } = await import('./seguir');
    await seguir(
      { tipoSeguido: 'team', entidadId: '22222222-2222-2222-2222-222222222222' },
      contextoCon('77777777-7777-7777-7777-777777777777'),
    );
    expect(invalidarCacheEquipo).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');
    expect(invalidarCacheTorneo).not.toHaveBeenCalled();
  });

  it('seguir dos veces es idempotente (ON CONFLICT DO NOTHING, no falla)', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 0 }) }),
    }));
    const { seguir } = await import('./seguir');
    await expect(
      seguir(
        { tipoSeguido: 'team', entidadId: '22222222-2222-2222-2222-222222222222' },
        contextoCon('77777777-7777-7777-7777-777777777777'),
      ),
    ).resolves.toEqual({ siguiendo: true });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { seguir } = await import('./seguir');
    await expect(
      seguir(
        { tipoSeguido: 'team', entidadId: '22222222-2222-2222-2222-222222222222' },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
