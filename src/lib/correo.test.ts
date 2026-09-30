import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeCorreo, enviarCorreo, hayProveedorDeCorreo } from './correo';

const CORREO = {
  para: 'capitana@ejemplo.com',
  asunto: 'Te invitaron a un equipo',
  html: '<p>hola</p>',
  texto: 'hola',
};

function configurar() {
  vi.stubEnv('RESEND_API_KEY', 'clave-de-prueba');
  vi.stubEnv('CORREO_REMITENTE', 'INVICTA <avisos@ejemplo.com>');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('hayProveedorDeCorreo', () => {
  it('es falso si falta cualquiera de las dos variables', () => {
    vi.stubEnv('RESEND_API_KEY', 'clave');
    vi.stubEnv('CORREO_REMITENTE', '');
    expect(hayProveedorDeCorreo()).toBe(false);
  });

  it('es verdadero con las dos cargadas', () => {
    configurar();
    expect(hayProveedorDeCorreo()).toBe(true);
  });
});

describe('enviarCorreo', () => {
  it('sin configurar, lanza reintentable y no toca la red', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('CORREO_REMITENTE', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const error = await enviarCorreo(CORREO).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorDeCorreo);
    expect(error.motivo).toBe('sin_configurar');
    // Reintentable: alguien puede cargar la variable, y el aviso tiene
    // que seguir esperando en vez de perderse.
    expect(error.reintentable).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda el correo al proveedor con el remitente configurado', async () => {
    configurar();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await enviarCorreo(CORREO);

    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(opciones.headers.Authorization).toBe('Bearer clave-de-prueba');
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.to).toEqual(['capitana@ejemplo.com']);
    expect(cuerpo.from).toBe('INVICTA <avisos@ejemplo.com>');
    // El texto plano viaja siempre: sin alternativa, varios clientes lo
    // marcan como spam.
    expect(cuerpo.text).toBe('hola');
  });

  /**
   * La razón de ser de este test: `fetch` no lanza con 4xx ni 5xx. Sin
   * el chequeo de `ok`, un correo rechazado se contaría como enviado y
   * la notificación quedaría `delivered` sin haber salido nunca.
   */
  it('un 422 del proveedor es un fallo, y no reintentable', async () => {
    configurar();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Invalid `to` field',
      }),
    );

    const error = await enviarCorreo(CORREO).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorDeCorreo);
    expect(error.motivo).toBe('rechazado');
    expect(error.reintentable).toBe(false);
    expect(error.message).toContain('422');
  });

  it('un 503 sí es reintentable: es el proveedor, no nosotros', async () => {
    configurar();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' }),
    );

    const error = await enviarCorreo(CORREO).catch((e) => e);

    expect(error.motivo).toBe('proveedor_caido');
    expect(error.reintentable).toBe(true);
  });

  it('un 429 también es reintentable', async () => {
    configurar();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' }),
    );

    const error = await enviarCorreo(CORREO).catch((e) => e);

    expect(error.reintentable).toBe(true);
  });

  it('si la red se cae, es reintentable', async () => {
    configurar();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    const error = await enviarCorreo(CORREO).catch((e) => e);

    expect(error.motivo).toBe('proveedor_caido');
    expect(error.reintentable).toBe(true);
  });
});
