import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const exchangeCodeForSession = vi.fn();
const completarRegistro = vi.fn();

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { exchangeCodeForSession } }),
}));
vi.mock('@/lib/contexto', () => ({ construirContexto: async () => ({ usuarioId: 'u1' }) }));
vi.mock('@/services/identidad/completarRegistro', () => ({ completarRegistro }));
vi.mock('@/services/identidad/confirmarEmailCuenta', () => ({ confirmarEmailCuenta: vi.fn() }));
vi.mock('@/services/organizadores/confirmarVerificacionBasica', () => ({
  confirmarVerificacionBasica: vi.fn(),
}));
vi.mock('@/services/organizadores/confirmarVerificacionesPendientes', () => ({
  confirmarVerificacionesPendientes: vi.fn(async () => []),
}));

const { GET } = await import('./route');

const pedido = (url: string) => ({ url }) as NextRequest;
const destino = async (segmentos?: string[]) => ({ destino: segmentos });

/** A dónde mandó el redirect, relativo al origen. */
const adondeFue = (respuesta: Response) =>
  new URL(respuesta.headers.get('location') ?? '').pathname;

describe('el callback de los enlaces por correo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} } },
      error: null,
    });
  });

  /**
   * La regresión que motivó el cambio: con el destino en la query, la
   * persona que pedía recuperar su contraseña terminaba en el inicio.
   */
  it('lleva al destino que viene en la ruta', async () => {
    const respuesta = await GET(
      pedido('https://sitio.test/auth/callback/restablecer-password?code=abc'),
      {
        params: destino(['restablecer-password']),
      },
    );
    expect(adondeFue(respuesta)).toBe('/restablecer-password');
  });

  it('arma rutas de varios segmentos', async () => {
    const respuesta = await GET(pedido('https://sitio.test/auth/callback/torneo/7?code=abc'), {
      params: destino(['torneo', '7']),
    });
    expect(adondeFue(respuesta)).toBe('/torneo/7');
  });

  /** Los enlaces que ya salieron por correo con la forma vieja. */
  it('sigue aceptando el destino en la query', async () => {
    const respuesta = await GET(pedido('https://sitio.test/auth/callback?code=abc&next=/perfil'), {
      params: destino(),
    });
    expect(adondeFue(respuesta)).toBe('/perfil');
  });

  it('cae al inicio cuando no viene destino', async () => {
    const respuesta = await GET(pedido('https://sitio.test/auth/callback?code=abc'), {
      params: destino(),
    });
    expect(adondeFue(respuesta)).toBe('/');
  });

  /**
   * `//otro-sitio.com` lo lee el navegador como otro dominio: sería una
   * forma de mandar gente a cualquier lado desde un enlace nuestro.
   */
  it('no obedece un destino que apunte fuera del sitio', async () => {
    const respuesta = await GET(
      pedido('https://sitio.test/auth/callback?code=abc&next=//otro-sitio.com'),
      { params: destino() },
    );
    expect(adondeFue(respuesta)).toBe('/');
  });

  it('manda al error cuando el código no sirve', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: new Error('vencido') });
    const respuesta = await GET(pedido('https://sitio.test/auth/callback?code=viejo'), {
      params: destino(),
    });
    expect(adondeFue(respuesta)).toBe('/auth/error');
  });
});

/**
 * Sin el motivo, "el enlace venció" y "el navegador no tiene el dato que
 * lo abre" se ven iguales desde la pantalla de error, y se arreglan en
 * lugares distintos.
 */
describe('el error dice por qué falló', () => {
  beforeEach(() => vi.clearAllMocks());

  const motivo = (respuesta: Response) =>
    new URL(respuesta.headers.get('location') ?? '').searchParams.get('motivo');

  it('pasa el código de error del canje', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: Object.assign(new Error('x'), { code: 'flow_state_not_found' }),
    });
    const respuesta = await GET(pedido('https://sitio.test/auth/callback?code=abc'), {
      params: destino(),
    });
    expect(motivo(respuesta)).toBe('flow_state_not_found');
  });

  it('pasa el error que manda el proveedor cuando ni siquiera hay código', async () => {
    const respuesta = await GET(
      pedido('https://sitio.test/auth/callback?error=access_denied&error_code=otp_expired'),
      { params: destino() },
    );
    expect(motivo(respuesta)).toBe('otp_expired');
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('distingue una llegada sin código de un canje fallido', async () => {
    const respuesta = await GET(pedido('https://sitio.test/auth/callback'), {
      params: destino(),
    });
    expect(motivo(respuesta)).toBe('sin-codigo');
  });
});
