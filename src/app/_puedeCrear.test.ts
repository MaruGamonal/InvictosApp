import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(fila: { email_confirmado: boolean; tiene_organizacion: boolean } | null) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({ query: async () => ({ rows: fila ? [fila] : [] }) }),
  }));
}

/**
 * Las dos pantallas de creación mostraban el formulario entero con un
 * aviso arriba: se podía completar todo y recién enterarse al enviar de
 * que la acción estaba bloqueada.
 */
describe('estadoParaCrear', () => {
  it('con la cuenta confirmada y organización propia, deja crear todo', async () => {
    mockearDb({ email_confirmado: true, tiene_organizacion: true });
    const { estadoParaCrear } = await import('./_puedeCrear');
    await expect(estadoParaCrear(contextoCon('u1'))).resolves.toEqual({
      cuentaConfirmada: true,
      tieneOrganizacion: true,
    });
  });

  it('distingue tener la cuenta confirmada de tener organización', async () => {
    mockearDb({ email_confirmado: true, tiene_organizacion: false });
    const { estadoParaCrear } = await import('./_puedeCrear');
    await expect(estadoParaCrear(contextoCon('u1'))).resolves.toEqual({
      cuentaConfirmada: true,
      tieneOrganizacion: false,
    });
  });

  it('sin sesión no consulta nada y no habilita nada', async () => {
    const query = vi.fn();
    vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
    const { estadoParaCrear } = await import('./_puedeCrear');
    await expect(estadoParaCrear(contextoCon(null))).resolves.toEqual({
      cuentaConfirmada: false,
      tieneOrganizacion: false,
    });
    expect(query).not.toHaveBeenCalled();
  });

  /** Mismo criterio que `verificarCuentaConfirmada`: no poder comprobar es negar. */
  it('sin fila de usuario, no habilita nada', async () => {
    mockearDb(null);
    const { estadoParaCrear } = await import('./_puedeCrear');
    await expect(estadoParaCrear(contextoCon('fantasma'))).resolves.toEqual({
      cuentaConfirmada: false,
      tieneOrganizacion: false,
    });
  });
});
