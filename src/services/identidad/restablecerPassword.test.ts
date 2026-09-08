import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateUser = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { updateUser } }),
}));

beforeEach(() => {
  updateUser.mockClear();
  updateUser.mockResolvedValue({ error: null });
});

describe('restablecerPassword', () => {
  it('actualiza la contraseña cuando hay sesión (de recuperación)', async () => {
    const { restablecerPassword } = await import('./restablecerPassword');
    const resultado = await restablecerPassword(
      { password: 'contraseñaNuevaSegura123' },
      { usuarioId: 'u-1', permisos: {}, esSistema: false },
    );

    expect(resultado).toEqual({ actualizada: true });
    expect(updateUser).toHaveBeenCalledWith({ password: 'contraseñaNuevaSegura123' });
  });

  it('rechaza con NO_AUTENTICADO sin sesión', async () => {
    const { restablecerPassword } = await import('./restablecerPassword');
    await expect(
      restablecerPassword(
        { password: 'contraseñaNuevaSegura123' },
        { usuarioId: null, permisos: {}, esSistema: false },
      ),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rechaza con DATOS_INVALIDOS una contraseña de menos de 8 caracteres', async () => {
    const { restablecerPassword } = await import('./restablecerPassword');
    await expect(
      restablecerPassword(
        { password: 'corta' },
        { usuarioId: 'u-1', permisos: {}, esSistema: false },
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(updateUser).not.toHaveBeenCalled();
  });
});
