import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

describe('dejarDeSeguir', () => {
  it('deja de seguir un equipo', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 1 }) }),
    }));
    const { dejarDeSeguir } = await import('./dejarDeSeguir');
    await expect(
      dejarDeSeguir(
        { tipoSeguido: 'team', entidadId: '22222222-2222-2222-2222-222222222222' },
        contextoCon('77777777-7777-7777-7777-777777777777'),
      ),
    ).resolves.toEqual({ siguiendo: false });
  });

  it('al dejar de seguir, invalida la caché de la entidad correspondiente', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 1 }) }),
    }));
    const invalidarCacheTorneo = vi.fn();
    const invalidarCacheEquipo = vi.fn();
    vi.doMock('@/lib/cache', () => ({ invalidarCacheTorneo, invalidarCacheEquipo }));
    const { dejarDeSeguir } = await import('./dejarDeSeguir');
    await dejarDeSeguir(
      { tipoSeguido: 'team', entidadId: '22222222-2222-2222-2222-222222222222' },
      contextoCon('77777777-7777-7777-7777-777777777777'),
    );
    expect(invalidarCacheEquipo).toHaveBeenCalledWith('22222222-2222-2222-2222-222222222222');
    expect(invalidarCacheTorneo).not.toHaveBeenCalled();
  });

  it('es idempotente: dejar de seguir algo que no se sigue no falla', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rowCount: 0 }) }),
    }));
    const { dejarDeSeguir } = await import('./dejarDeSeguir');
    await expect(
      dejarDeSeguir(
        { tipoSeguido: 'tournament', entidadId: '11111111-1111-1111-1111-111111111111' },
        contextoCon('77777777-7777-7777-7777-777777777777'),
      ),
    ).resolves.toEqual({ siguiendo: false });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { dejarDeSeguir } = await import('./dejarDeSeguir');
    await expect(
      dejarDeSeguir(
        { tipoSeguido: 'team', entidadId: '22222222-2222-2222-2222-222222222222' },
        contextoCon(null),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
