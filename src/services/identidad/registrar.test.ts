import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';
import { esErrorDeAplicacion } from '@/lib/errores';

const USUARIO_ID = '11111111-1111-1111-1111-111111111111';

const createUser = vi.fn().mockResolvedValue({ data: { user: { id: USUARIO_ID } }, error: null });
const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
const completarRegistro = vi.fn().mockResolvedValue({
  usuarioId: USUARIO_ID,
  perfilDeportivoId: 'perfil-1',
  yaExistia: false,
});

vi.mock('@/lib/supabase/admin', () => ({
  obtenerClienteAdmin: () => ({ auth: { admin: { createUser } } }),
}));

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { signInWithPassword } }),
}));

vi.mock('./completarRegistro', () => ({
  completarRegistro: (...args: unknown[]) => completarRegistro(...args),
}));

beforeEach(() => {
  reiniciarLimitesDeFrecuencia();
  createUser.mockClear();
  signInWithPassword.mockClear();
  completarRegistro.mockClear();
  createUser.mockResolvedValue({ data: { user: { id: USUARIO_ID } }, error: null });
  signInWithPassword.mockResolvedValue({ error: null });
  completarRegistro.mockResolvedValue({
    usuarioId: USUARIO_ID,
    perfilDeportivoId: 'perfil-1',
    yaExistia: false,
  });
});

const CONTRASENA = 'contraseñaSegura123';
const CONTEXTO_SISTEMA = { usuarioId: null, permisos: {}, esSistema: true } as const;

describe('iniciarRegistro', () => {
  it('crea la cuenta ya confirmada, completa el registro e inicia sesión al toque (D-52, FLOWS.md Flujo 1)', async () => {
    const { iniciarRegistro } = await import('./registrar');
    const resultado = await iniciarRegistro(
      {
        identificadorAcceso: 'capitan@example.com',
        nombreVisible: 'Capitán Uno',
        password: CONTRASENA,
      },
      CONTEXTO_SISTEMA,
    );

    expect(resultado).toEqual({ cuentaCreada: true });
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'capitan@example.com',
        password: CONTRASENA,
        email_confirm: true,
        user_metadata: expect.objectContaining({ nombre_visible: 'Capitán Uno' }),
      }),
    );
    expect(completarRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: USUARIO_ID,
        email: 'capitan@example.com',
        nombreVisible: 'Capitán Uno',
      }),
      expect.anything(),
    );
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'capitan@example.com',
      password: CONTRASENA,
    });
  });

  it('rechaza con DATOS_INVALIDOS un email con formato inválido', async () => {
    const { iniciarRegistro } = await import('./registrar');
    await expect(
      iniciarRegistro(
        { identificadorAcceso: 'no-es-un-email', nombreVisible: 'Alguien', password: CONTRASENA },
        CONTEXTO_SISTEMA,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza con DATOS_INVALIDOS una contraseña de menos de 8 caracteres', async () => {
    const { iniciarRegistro } = await import('./registrar');
    await expect(
      iniciarRegistro(
        { identificadorAcceso: 'alguien@example.com', nombreVisible: 'Alguien', password: 'corta' },
        CONTEXTO_SISTEMA,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza con CORREO_YA_REGISTRADO si el correo ya tiene cuenta', async () => {
    createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    });
    const { iniciarRegistro } = await import('./registrar');
    await expect(
      iniciarRegistro(
        {
          identificadorAcceso: 'ya-existe@example.com',
          nombreVisible: 'Alguien',
          password: CONTRASENA,
        },
        CONTEXTO_SISTEMA,
      ),
    ).rejects.toMatchObject({ codigo: 'CORREO_YA_REGISTRADO' });
    expect(completarRegistro).not.toHaveBeenCalled();
  });

  it('pasa la acción pendiente a completarRegistro', async () => {
    const { iniciarRegistro } = await import('./registrar');
    await iniciarRegistro(
      {
        identificadorAcceso: 'visitante@example.com',
        nombreVisible: 'Visitante',
        password: CONTRASENA,
        accionPendiente: { tipo: 'seguir_torneo', datos: { torneoId: 't-1' } },
      },
      CONTEXTO_SISTEMA,
    );

    expect(completarRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        accionPendiente: { tipo: 'seguir_torneo', datos: { torneoId: 't-1' } },
      }),
      expect.anything(),
    );
  });

  it('corta después del límite de intentos configurado desde el mismo identificador', async () => {
    const { iniciarRegistro } = await import('./registrar');
    const input = {
      identificadorAcceso: 'insistente@example.com',
      nombreVisible: 'Alguien',
      password: CONTRASENA,
    };

    for (let i = 0; i < 5; i += 1) {
      await iniciarRegistro(input, CONTEXTO_SISTEMA);
    }

    let error: unknown;
    try {
      await iniciarRegistro(input, CONTEXTO_SISTEMA);
    } catch (e) {
      error = e;
    }

    expect(esErrorDeAplicacion(error)).toBe(true);
    expect(createUser).toHaveBeenCalledTimes(5);
  });
});
