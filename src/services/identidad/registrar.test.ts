import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';
import { esErrorDeAplicacion } from '@/lib/errores';

const signUp = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { signUp } }),
}));

beforeEach(() => {
  reiniciarLimitesDeFrecuencia();
  signUp.mockClear();
  signUp.mockResolvedValue({ error: null });
});

const CONTRASENA = 'contraseñaSegura123';

describe('iniciarRegistro', () => {
  it('pide identificador de acceso, nombre visible y contraseña (D-52)', async () => {
    const { iniciarRegistro } = await import('./registrar');
    const resultado = await iniciarRegistro(
      {
        identificadorAcceso: 'capitan@example.com',
        nombreVisible: 'Capitán Uno',
        password: CONTRASENA,
      },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(resultado).toEqual({ enviado: true });
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'capitan@example.com',
        password: CONTRASENA,
        options: expect.objectContaining({
          data: expect.objectContaining({ nombre_visible: 'Capitán Uno' }),
        }),
      }),
    );
  });

  it('rechaza con DATOS_INVALIDOS un email con formato inválido', async () => {
    const { iniciarRegistro } = await import('./registrar');
    await expect(
      iniciarRegistro(
        { identificadorAcceso: 'no-es-un-email', nombreVisible: 'Alguien', password: CONTRASENA },
        { usuarioId: null, permisos: {}, esSistema: true },
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(signUp).not.toHaveBeenCalled();
  });

  it('rechaza con DATOS_INVALIDOS una contraseña de menos de 8 caracteres', async () => {
    const { iniciarRegistro } = await import('./registrar');
    await expect(
      iniciarRegistro(
        { identificadorAcceso: 'alguien@example.com', nombreVisible: 'Alguien', password: 'corta' },
        { usuarioId: null, permisos: {}, esSistema: true },
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(signUp).not.toHaveBeenCalled();
  });

  it('pasa la acción pendiente en la metadata, para que completarRegistro la ejecute', async () => {
    const { iniciarRegistro } = await import('./registrar');
    await iniciarRegistro(
      {
        identificadorAcceso: 'visitante@example.com',
        nombreVisible: 'Visitante',
        password: CONTRASENA,
        accionPendiente: { tipo: 'seguir_torneo', datos: { torneoId: 't-1' } },
      },
      { usuarioId: null, permisos: {}, esSistema: true },
    );

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            accion_pendiente: { tipo: 'seguir_torneo', datos: { torneoId: 't-1' } },
          }),
        }),
      }),
    );
  });

  it('corta después del límite de intentos configurado desde el mismo identificador', async () => {
    const { iniciarRegistro } = await import('./registrar');
    const input = {
      identificadorAcceso: 'insistente@example.com',
      nombreVisible: 'Alguien',
      password: CONTRASENA,
    };
    const contexto = { usuarioId: null, permisos: {}, esSistema: true } as const;

    for (let i = 0; i < 5; i += 1) {
      await iniciarRegistro(input, contexto);
    }

    let error: unknown;
    try {
      await iniciarRegistro(input, contexto);
    } catch (e) {
      error = e;
    }

    expect(esErrorDeAplicacion(error)).toBe(true);
    expect(signUp).toHaveBeenCalledTimes(5);
  });
});
