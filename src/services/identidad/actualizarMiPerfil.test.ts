import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

describe('actualizarMiPerfil', () => {
  it('un perfil sin ningún dato completado se puede actualizar de a un campo, sin bloquear nada', async () => {
    vi.doMock('@/db/cliente', () => ({
      obtenerPool: () => ({ query: async () => ({ rows: [{ id: 'perfil-1' }] }) }),
    }));
    const { actualizarMiPerfil } = await import('./actualizarMiPerfil');
    await expect(
      actualizarMiPerfil({ posicion: 'goalkeeper' }, contextoCon('usuario-1')),
    ).resolves.toEqual({ id: 'perfil-1' });
    vi.doUnmock('@/db/cliente');
  });

  it('sin ningún campo, DATOS_INVALIDOS', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { actualizarMiPerfil } = await import('./actualizarMiPerfil');
    await expect(actualizarMiPerfil({}, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
    vi.doUnmock('@/db/cliente');
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query: vi.fn() }) }));
    const { actualizarMiPerfil } = await import('./actualizarMiPerfil');
    await expect(
      actualizarMiPerfil({ posicion: 'goalkeeper' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    vi.doUnmock('@/db/cliente');
  });
});
