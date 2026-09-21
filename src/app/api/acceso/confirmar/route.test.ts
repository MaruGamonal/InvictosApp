import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const verifyOtp = vi.fn();
const completarAcceso = vi.fn();

vi.mock('@/lib/supabase/servidor', () => ({
  crearClienteServidor: async () => ({ auth: { verifyOtp } }),
}));
vi.mock('../../../auth/_completarAcceso', () => ({
  completarAcceso,
  leerIntencion: (segmentos?: string[]) =>
    segmentos?.[0] === 'organizacion' ? { organizacionId: segmentos[1] } : {},
}));

const { POST } = await import('./route');

const pedidoCon = (campos: Record<string, string>) => {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(campos)) formulario.set(clave, valor);
  return {
    url: 'https://sitio.test/api/acceso/confirmar',
    formData: async () => formulario,
  } as unknown as NextRequest;
};

const adondeFue = (respuesta: Response) => new URL(respuesta.headers.get('location') ?? '');

describe('confirmar un enlace de acceso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtp.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: {} } }, error: null });
  });

  it('canjea el token y ejecuta la acción del enlace', async () => {
    const respuesta = await POST(pedidoCon({ token_hash: 'abc', type: 'magiclink' }));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'magiclink' });
    expect(completarAcceso).toHaveBeenCalledWith({ id: 'u1', user_metadata: {} }, {});
    expect(adondeFue(respuesta).pathname).toBe('/inicio');
    expect(respuesta.status).toBe(303);
  });

  /** Un `type` de afuera no se reenvía tal cual al proveedor. */
  /**
   * Para qué se mandó el enlace viaja en la ruta. Antes iba en la
   * metadata del usuario, que en estos enlaces no llega nunca.
   */
  it('pasa la intención que venía en la ruta', async () => {
    await POST(
      pedidoCon({
        token_hash: 'abc',
        intencion: 'organizacion/11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(completarAcceso).toHaveBeenCalledWith(expect.anything(), {
      organizacionId: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('ignora un tipo que no emitimos', async () => {
    await POST(pedidoCon({ token_hash: 'abc', type: 'recovery_de_mentira' }));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'magiclink' });
  });

  it('pasa el motivo cuando el token ya no sirve', async () => {
    verifyOtp.mockResolvedValue({
      data: {},
      error: Object.assign(new Error('x'), { code: 'otp_expired' }),
    });
    const respuesta = await POST(pedidoCon({ token_hash: 'viejo' }));
    expect(adondeFue(respuesta).searchParams.get('motivo')).toBe('otp_expired');
    expect(completarAcceso).not.toHaveBeenCalled();
  });

  it('no llama al proveedor si no vino token', async () => {
    const respuesta = await POST(pedidoCon({}));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(adondeFue(respuesta).searchParams.get('motivo')).toBe('sin-token');
  });
});
