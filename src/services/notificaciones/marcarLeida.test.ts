import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

describe('marcarLeida', () => {
  it('marca como leída una notificación propia', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({
        query: async () => ({ rows: [{ id: '88888888-8888-8888-8888-888888888888' }] }),
      }),
    }));
    const { marcarLeida } = await import('./marcarLeida');
    await expect(
      marcarLeida(
        { notificacionId: '88888888-8888-8888-8888-888888888888' },
        contextoCon('77777777-7777-7777-7777-777777777777'),
      ),
    ).resolves.toEqual({ id: '88888888-8888-8888-8888-888888888888' });
  });

  it('una notificación ajena o inexistente da NO_ENCONTRADO', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [] }) }),
    }));
    const { marcarLeida } = await import('./marcarLeida');
    await expect(
      marcarLeida(
        { notificacionId: '88888888-8888-8888-8888-888888888888' },
        contextoCon('77777777-7777-7777-7777-777777777777'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { marcarLeida } = await import('./marcarLeida');
    await expect(
      marcarLeida({ notificacionId: '88888888-8888-8888-8888-888888888888' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
