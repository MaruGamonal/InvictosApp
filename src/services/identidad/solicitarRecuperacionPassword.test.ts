import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';

const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { resetPasswordForEmail } }),
}));

beforeEach(() => {
  reiniciarLimitesDeFrecuencia();
  resetPasswordForEmail.mockClear();
});

describe('solicitarRecuperacionPassword', () => {
  it('manda el enlace de recuperación con el redirectTo correcto', async () => {
    const { solicitarRecuperacionPassword } = await import('./solicitarRecuperacionPassword');
    const resultado = await solicitarRecuperacionPassword(
      { identificadorAcceso: 'capitan@example.com' },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(resultado).toEqual({ enviado: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'capitan@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback?next=/restablecer-password'),
      }),
    );
  });

  it('rechaza con DATOS_INVALIDOS un email con formato inválido', async () => {
    const { solicitarRecuperacionPassword } = await import('./solicitarRecuperacionPassword');
    await expect(
      solicitarRecuperacionPassword(
        { identificadorAcceso: 'no-es-un-email' },
        { usuarioId: null, permisos: {}, esSistema: true },
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('corta después del límite de intentos configurado desde el mismo identificador', async () => {
    const { solicitarRecuperacionPassword } = await import('./solicitarRecuperacionPassword');
    const input = { identificadorAcceso: 'insistente@example.com' };
    const contexto = { usuarioId: null, permisos: {}, esSistema: true } as const;

    for (let i = 0; i < 5; i += 1) {
      await solicitarRecuperacionPassword(input, contexto);
    }

    await expect(solicitarRecuperacionPassword(input, contexto)).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(5);
  });
});
