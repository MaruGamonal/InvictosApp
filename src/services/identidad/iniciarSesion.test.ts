import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';

const signInWithPassword = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { signInWithPassword } }),
}));

beforeEach(() => {
  reiniciarLimitesDeFrecuencia();
  signInWithPassword.mockClear();
  signInWithPassword.mockResolvedValue({ error: null });
});

describe('iniciarSesion', () => {
  it('ingresa con correo y contraseña correctos', async () => {
    const { iniciarSesion } = await import('./iniciarSesion');
    const resultado = await iniciarSesion(
      { identificadorAcceso: 'capitan@example.com', password: 'contraseñaSegura123' },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(resultado).toEqual({ ingresado: true });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'capitan@example.com',
      password: 'contraseñaSegura123',
    });
  });

  it('rechaza con CREDENCIALES_INVALIDAS cuando Supabase devuelve error', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });
    const { iniciarSesion } = await import('./iniciarSesion');

    await expect(
      iniciarSesion(
        { identificadorAcceso: 'capitan@example.com', password: 'incorrecta' },
        { usuarioId: null, permisos: {}, esSistema: true },
      ),
    ).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
  });

  it('rechaza con DATOS_INVALIDOS un email con formato inválido', async () => {
    const { iniciarSesion } = await import('./iniciarSesion');
    await expect(
      iniciarSesion(
        { identificadorAcceso: 'no-es-un-email', password: 'contraseñaSegura123' },
        { usuarioId: null, permisos: {}, esSistema: true },
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('corta después del límite de intentos configurado desde el mismo identificador', async () => {
    const { iniciarSesion } = await import('./iniciarSesion');
    const input = {
      identificadorAcceso: 'insistente@example.com',
      password: 'contraseñaSegura123',
    };
    const contexto = { usuarioId: null, permisos: {}, esSistema: true } as const;

    for (let i = 0; i < 8; i += 1) {
      await iniciarSesion(input, contexto);
    }

    await expect(iniciarSesion(input, contexto)).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
    expect(signInWithPassword).toHaveBeenCalledTimes(8);
  });
});
