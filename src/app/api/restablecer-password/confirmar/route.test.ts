import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const verifyOtp = vi.fn();
vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { verifyOtp } }),
}));

const { POST } = await import('./route');

const pedidoCon = (campos: Record<string, string>) => {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(campos)) formulario.set(clave, valor);
  return {
    url: 'https://sitio.test/api/restablecer-password/confirmar',
    formData: async () => formulario,
  } as unknown as NextRequest;
};

const adondeFue = (respuesta: Response) => new URL(respuesta.headers.get('location') ?? '');

describe('confirmar la recuperación de contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtp.mockResolvedValue({ error: null });
  });

  it('canjea el token y lleva a elegir la contraseña nueva', async () => {
    const respuesta = await POST(pedidoCon({ token_hash: 'abc', type: 'recovery' }));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' });
    expect(adondeFue(respuesta).pathname).toBe('/restablecer-password');
  });

  /**
   * Con un 302 el navegador reenvía el POST al recargar, y el segundo
   * intento choca contra un token ya gastado.
   */
  it('redirige con 303 para que recargar no reintente el token', async () => {
    const respuesta = await POST(pedidoCon({ token_hash: 'abc' }));
    expect(respuesta.status).toBe(303);
  });

  it('pasa el motivo cuando el token ya no sirve', async () => {
    verifyOtp.mockResolvedValue({ error: Object.assign(new Error('x'), { code: 'otp_expired' }) });
    const respuesta = await POST(pedidoCon({ token_hash: 'viejo' }));
    const destino = adondeFue(respuesta);
    expect(destino.pathname).toBe('/auth/error');
    expect(destino.searchParams.get('motivo')).toBe('otp_expired');
  });

  it('no llama al proveedor si no vino token', async () => {
    const respuesta = await POST(pedidoCon({}));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(adondeFue(respuesta).searchParams.get('motivo')).toBe('sin-token');
  });
});
