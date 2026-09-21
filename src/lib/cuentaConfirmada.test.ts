import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from './contexto';

const contextoCon = (usuarioId: string | null, esSistema = false): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  emailConfirmado?: boolean;
  email?: string;
  signInWithOtp?: ReturnType<typeof vi.fn>;
}) {
  const signInWithOtp = opciones.signInWithOtp ?? vi.fn(async () => ({ error: null }));
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async () => ({
        rows:
          opciones.emailConfirmado === undefined
            ? []
            : [
                {
                  email: opciones.email ?? 'vale@example.com',
                  email_confirmado: opciones.emailConfirmado,
                },
              ],
      }),
    }),
  }));
  vi.doMock('@/lib/supabase/admin', () => ({
    obtenerClienteAdmin: () => ({ auth: { signInWithOtp } }),
  }));
  return signInWithOtp;
}

describe('verificarCuentaConfirmada', () => {
  it('cuenta confirmada, no rechaza ni reenvía nada', async () => {
    const signInWithOtp = mockearDb({ emailConfirmado: true });
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('usuario-1'))).resolves.toBeUndefined();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('cuenta sin confirmar, CUENTA_NO_CONFIRMADA', async () => {
    mockearDb({ emailConfirmado: false });
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'CUENTA_NO_CONFIRMADA',
    });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('contexto de sistema, siempre pasa', async () => {
    mockearDb({});
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon(null, true))).resolves.toBeUndefined();
  });

  it('cuenta sin confirmar, reenvía el correo de confirmación en el momento del bloqueo', async () => {
    const signInWithOtp = mockearDb({ emailConfirmado: false, email: 'vale@example.com' });
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'CUENTA_NO_CONFIRMADA',
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'vale@example.com',
      options: expect.objectContaining({
        shouldCreateUser: false,
        // En la URL de vuelta y no en `data`: `signInWithOtp` solo aplica
        // `data` cuando crea la cuenta, y acá la cuenta ya existe.
        emailRedirectTo: expect.stringContaining('/acceso/confirmar'),
      }),
    });
  });

  /**
   * Una sesión cuya cuenta no existe en la base: pasa si el registro se
   * cortó entre crear la cuenta en el proveedor y crear la fila. Antes
   * caía en el mismo `return` que "ya confirmada" y se saltaba el
   * bloqueo.
   */
  it('no deja pasar una sesión sin fila de usuario', async () => {
    // Sin `emailConfirmado`, el mock devuelve cero filas.
    mockearDb({});
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('fantasma'))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('si el envío del correo falla, igual bloquea (no rompe el gate por eso)', async () => {
    mockearDb({
      emailConfirmado: false,
      signInWithOtp: vi.fn(async () => ({ error: new Error('boom') })),
    });
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    await expect(verificarCuentaConfirmada(contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'CUENTA_NO_CONFIRMADA',
    });
  });

  it('agotado el límite de reenvíos, deja de mandar el correo pero sigue bloqueando (comparte el límite del botón "Reenviar enlace")', async () => {
    const signInWithOtp = mockearDb({ emailConfirmado: false });
    const { verificarCuentaConfirmada } = await import('./cuentaConfirmada');
    const contexto = contextoCon('usuario-1');

    for (let intento = 0; intento < 3; intento++) {
      await expect(verificarCuentaConfirmada(contexto)).rejects.toMatchObject({
        codigo: 'CUENTA_NO_CONFIRMADA',
      });
    }
    expect(signInWithOtp).toHaveBeenCalledTimes(3);

    await expect(verificarCuentaConfirmada(contexto)).rejects.toMatchObject({
      codigo: 'CUENTA_NO_CONFIRMADA',
    });
    expect(signInWithOtp).toHaveBeenCalledTimes(3);
  });
});
