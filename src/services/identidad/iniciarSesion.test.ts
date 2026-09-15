import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';

const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
const crearClienteServidor = vi.fn(async (_opciones?: { recordarSesion?: boolean }) => ({
  auth: { signInWithPassword },
}));
const cookieSet = vi.fn();

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: (opciones?: { recordarSesion?: boolean }) => crearClienteServidor(opciones),
  NOMBRE_COOKIE_RECORDAR: 'recordar_sesion',
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
}));

beforeEach(() => {
  reiniciarLimitesDeFrecuencia();
  signInWithPassword.mockClear();
  signInWithPassword.mockResolvedValue({ error: null });
  crearClienteServidor.mockClear();
  cookieSet.mockClear();
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

  it('sin indicar "recordarme", recuerda por default (comportamiento de siempre)', async () => {
    const { iniciarSesion } = await import('./iniciarSesion');
    await iniciarSesion(
      { identificadorAcceso: 'capitan@example.com', password: 'contraseñaSegura123' },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(crearClienteServidor).toHaveBeenCalledWith({ recordarSesion: true });
    expect(cookieSet).toHaveBeenCalledWith(
      'recordar_sesion',
      '1',
      expect.objectContaining({ maxAge: 400 * 24 * 60 * 60 }),
    );
  });

  it('con "recordarme: false", la cookie de sesión no queda persistente', async () => {
    const { iniciarSesion } = await import('./iniciarSesion');
    await iniciarSesion(
      {
        identificadorAcceso: 'capitan@example.com',
        password: 'contraseñaSegura123',
        recordarme: false,
      },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(crearClienteServidor).toHaveBeenCalledWith({ recordarSesion: false });
    const opciones = cookieSet.mock.calls[0]![2];
    expect(cookieSet).toHaveBeenCalledWith('recordar_sesion', '0', expect.anything());
    expect(opciones.maxAge).toBeUndefined();
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
