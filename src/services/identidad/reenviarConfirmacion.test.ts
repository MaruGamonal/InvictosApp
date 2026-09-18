import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  usuario?: { email: string; email_confirmado: boolean } | null;
  signInWithOtp?: ReturnType<typeof vi.fn>;
}) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async () => ({ rows: opciones.usuario ? [opciones.usuario] : [] }),
    }),
  }));
  vi.doMock('@/lib/supabase/admin', () => ({
    obtenerClienteAdmin: () => ({
      auth: { signInWithOtp: opciones.signInWithOtp ?? vi.fn(async () => ({ error: null })) },
    }),
  }));
}

describe('reenviarConfirmacion', () => {
  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { reenviarConfirmacion } = await import('./reenviarConfirmacion');
    await expect(reenviarConfirmacion(undefined, contextoCon(null))).rejects.toMatchObject({
      codigo: 'NO_AUTENTICADO',
    });
  });

  it('reenvía el enlace a la cuenta sin confirmar', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));
    mockearDb({
      usuario: { email: 'vale@example.com', email_confirmado: false },
      signInWithOtp,
    });
    const { reenviarConfirmacion } = await import('./reenviarConfirmacion');

    const resultado = await reenviarConfirmacion(undefined, contextoCon('usuario-1'));

    expect(resultado).toEqual({ enviado: true });
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'vale@example.com' }),
    );
  });

  it('si ya está confirmada, no reenvía nada', async () => {
    const signInWithOtp = vi.fn(async () => ({ error: null }));
    mockearDb({ usuario: { email: 'vale@example.com', email_confirmado: true }, signInWithOtp });
    const { reenviarConfirmacion } = await import('./reenviarConfirmacion');

    const resultado = await reenviarConfirmacion(undefined, contextoCon('usuario-1'));

    expect(resultado).toEqual({ enviado: true });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('si Supabase falla al enviar, ERROR_INTERNO', async () => {
    mockearDb({
      usuario: { email: 'vale@example.com', email_confirmado: false },
      signInWithOtp: vi.fn(async () => ({ error: new Error('boom') })),
    });
    const { reenviarConfirmacion } = await import('./reenviarConfirmacion');

    await expect(reenviarConfirmacion(undefined, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'ERROR_INTERNO',
    });
  });

  it('usuario inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ usuario: null });
    const { reenviarConfirmacion } = await import('./reenviarConfirmacion');
    await expect(reenviarConfirmacion(undefined, contextoCon('usuario-1'))).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });
});
