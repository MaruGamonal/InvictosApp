import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from './contexto';

const contextoCon = (usuarioId: string | null, esSistema = false): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema,
});

beforeEach(() => vi.resetModules());

function mockearDb(emailConfirmado: boolean | undefined) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async () => ({
        rows: emailConfirmado === undefined ? [] : [{ email_confirmado: emailConfirmado }],
      }),
    }),
  }));
}

describe('verificarCuentaConfirmada', () => {
  it('cuenta confirmada, no rechaza', async () => {
    mockearDb(true);
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('usuario-1'))).resolves.toBeUndefined();
  });

  it('cuenta sin confirmar, CUENTA_NO_CONFIRMADA', async () => {
    mockearDb(false);
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'CUENTA_NO_CONFIRMADA',
    });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb(undefined);
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('contexto de sistema, siempre pasa', async () => {
    mockearDb(undefined);
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon(null, true))).resolves.toBeUndefined();
  });
});
