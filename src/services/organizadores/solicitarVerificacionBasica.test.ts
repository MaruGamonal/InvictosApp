import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';
import { reiniciarLimitesDeFrecuencia } from '@/lib/limiteFrecuencia';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});
const ORG = '11111111-1111-1111-1111-111111111111';

function mockearDb(rolEnOrganizacion: 'owner' | 'admin' | null) {
  const query = vi.fn(async (texto: string) => {
    const sql = texto.toUpperCase();
    if (sql.includes('FROM MIEMBRO_ORGANIZACION')) {
      return { rows: rolEnOrganizacion ? [{ rol: rolEnOrganizacion }] : [] };
    }
    if (sql.includes('FROM ORGANIZACION O JOIN USUARIO')) {
      return {
        rows: [
          {
            email: 'titular@example.com',
            nombre: 'Club Atlético Posadas',
            nivel_verificacion: 'unverified',
          },
        ],
      };
    }
    return { rows: [] };
  });
  vi.doMock('@/db/cliente', () => ({ obtenerPool: () => ({ query }) }));
}

interface CorreoEnviado {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

/** Con proveedor propio el correo lo armamos nosotros; sin él, lo manda Supabase. */
function mockearCorreo(hayProveedor: boolean) {
  const enviarCorreo = vi.fn(async (_correo: CorreoEnviado) => undefined);
  vi.doMock('@/lib/correo', () => ({
    hayProveedorDeCorreo: () => hayProveedor,
    enviarCorreo,
  }));
  return enviarCorreo;
}

beforeEach(() => {
  vi.resetModules();
  reiniciarLimitesDeFrecuencia();
});

afterEach(() => {
  vi.doUnmock('@/db/cliente');
  vi.doUnmock('@/lib/supabase/admin');
  vi.doUnmock('@/lib/correo');
});

describe('solicitarVerificacionBasica', () => {
  /**
   * El motivo del correo propio: la plantilla de Magic Link de Supabase
   * es compartida con la confirmación de cuenta y no puede nombrar la
   * organización. `generateLink` devuelve el token sin mandar nada.
   */
  it('con proveedor propio arma el correo acá, nombrando la organización', async () => {
    mockearDb('owner');
    const enviarCorreo = mockearCorreo(true);
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: { hashed_token: 'token-123' } },
      error: null,
    });
    const signInWithOtp = vi.fn();
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { generateLink }, signInWithOtp } }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    const resultado = await solicitarVerificacionBasica(
      { organizacionId: ORG },
      contextoCon('titular'),
    );

    expect(resultado).toEqual({ enviado: true });
    // Supabase genera el token pero no manda nada.
    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(generateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'magiclink',
        email: 'titular@example.com',
        options: { redirectTo: expect.stringContaining(`/acceso/confirmar/organizacion/${ORG}`) },
      }),
    );

    expect(enviarCorreo).toHaveBeenCalledTimes(1);
    const correo = enviarCorreo.mock.calls[0]![0];
    expect(correo.para).toBe('titular@example.com');
    expect(correo.asunto).toBe('Verificá Club Atlético Posadas');
    // El enlace lo armamos nosotros: por eso este flujo ya no depende de
    // la lista de Redirect URLs del panel de Supabase.
    expect(correo.html).toContain(
      `/acceso/confirmar/organizacion/${ORG}?token_hash=token-123&type=magiclink`,
    );
  });

  /** Sin las variables de entorno del proveedor, mejor un correo genérico que ninguno. */
  it('sin proveedor propio cae al envío de Supabase', async () => {
    mockearDb('owner');
    const enviarCorreo = mockearCorreo(false);
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const generateLink = vi.fn();
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ auth: { admin: { generateLink }, signInWithOtp } }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    const resultado = await solicitarVerificacionBasica(
      { organizacionId: ORG },
      contextoCon('titular'),
    );

    expect(resultado).toEqual({ enviado: true });
    expect(enviarCorreo).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'titular@example.com',
        options: expect.objectContaining({
          shouldCreateUser: false,
          emailRedirectTo: expect.stringContaining(`/acceso/confirmar/organizacion/${ORG}`),
        }),
      }),
    );
  });

  /** Si el correo no sale, el pedido falla: no decimos «enviado» sin haber enviado. */
  it('si el proveedor rechaza el correo, falla', async () => {
    mockearDb('owner');
    vi.doMock('@/lib/correo', () => ({
      hayProveedorDeCorreo: () => true,
      enviarCorreo: vi.fn(async () => {
        throw new Error('casilla inválida');
      }),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({
        auth: {
          admin: {
            generateLink: vi
              .fn()
              .mockResolvedValue({ data: { properties: { hashed_token: 't' } }, error: null }),
          },
          signInWithOtp: vi.fn(),
        },
      }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    await expect(
      solicitarVerificacionBasica({ organizacionId: ORG }, contextoCon('titular')),
    ).rejects.toMatchObject({ codigo: 'ERROR_INTERNO' });
  });

  it('si Supabase no devuelve el token, falla', async () => {
    mockearDb('owner');
    mockearCorreo(true);
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({
        auth: {
          admin: { generateLink: vi.fn().mockResolvedValue({ data: null, error: new Error('x') }) },
          signInWithOtp: vi.fn(),
        },
      }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    await expect(
      solicitarVerificacionBasica({ organizacionId: ORG }, contextoCon('titular')),
    ).rejects.toMatchObject({ codigo: 'ERROR_INTERNO' });
  });

  it('un Administrador (no Titular) no puede solicitarla', async () => {
    mockearDb('admin');
    mockearCorreo(true);
    vi.doMock('@/lib/supabase/admin', () => ({
      obtenerClienteAdmin: () => ({
        auth: { admin: { generateLink: vi.fn() }, signInWithOtp: vi.fn() },
      }),
    }));

    const { solicitarVerificacionBasica } = await import('./solicitarVerificacionBasica');
    await expect(
      solicitarVerificacionBasica({ organizacionId: ORG }, contextoCon('admin-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
