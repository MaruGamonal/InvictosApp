import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  subirArchivo,
  validarArchivo,
  TAMANO_MAXIMO_SUBIDA_BYTES,
  TIPOS_IMAGEN,
  TIPOS_DOCUMENTO,
} from './subidaCliente';

const archivoDe = (bytes: number, tipo: string) =>
  ({ size: bytes, type: tipo, name: 'foto.jpg' }) as File;

describe('validarArchivo', () => {
  it('acepta una imagen dentro del tope', () => {
    expect(validarArchivo(archivoDe(1024, 'image/jpeg'), TIPOS_IMAGEN)).toBeNull();
  });

  /**
   * Por encima del tope la plataforma corta el cuerpo antes de que llegue
   * al servidor: si no se avisa acá, el rechazo llega sin explicación.
   */
  it('rechaza una imagen más grande que el tope, diciendo cuánto pesa', () => {
    const problema = validarArchivo(
      archivoDe(TAMANO_MAXIMO_SUBIDA_BYTES * 1.6, 'image/jpeg'),
      TIPOS_IMAGEN,
    );
    expect(problema).toContain('6.4 MB');
    expect(problema).toContain('máximo es 4 MB');
  });

  it('rechaza un formato que no aceptamos', () => {
    expect(validarArchivo(archivoDe(1024, 'image/gif'), TIPOS_IMAGEN)).toContain('JPG, PNG o WEBP');
  });

  it('para el reglamento pide PDF', () => {
    expect(validarArchivo(archivoDe(1024, 'image/jpeg'), TIPOS_DOCUMENTO)).toContain('PDF');
    expect(validarArchivo(archivoDe(1024, 'application/pdf'), TIPOS_DOCUMENTO)).toBeNull();
  });
});

describe('subirArchivo', () => {
  afterEach(() => vi.unstubAllGlobals());

  const responder = (cuerpo: unknown, opciones: { ok?: boolean; status?: number } = {}) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: opciones.ok ?? true,
        status: opciones.status ?? 200,
        json: async () => cuerpo,
      })),
    );

  it('devuelve los datos cuando sale bien', async () => {
    responder({ ok: true, data: { escudoUrl: 'https://ejemplo/1.png' } });
    const resultado = await subirArchivo('/api/equipos/escudo', new FormData());
    expect(resultado).toEqual({ ok: true, data: { escudoUrl: 'https://ejemplo/1.png' } });
  });

  it('pasa el mensaje del servidor cuando rechaza', async () => {
    responder(
      { ok: false, error: { mensaje: 'No tenés permiso para hacer esto.' } },
      { ok: false },
    );
    const resultado = await subirArchivo('/api/equipos/escudo', new FormData());
    expect(resultado).toMatchObject({ ok: false, mensaje: 'No tenés permiso para hacer esto.' });
  });

  /**
   * El caso que se reportaba como "No pudimos conectar": la plataforma
   * corta el cuerpo y responde algo que no es JSON, y el `json()` que
   * falla estaba dentro del mismo `catch` que la red.
   */
  it('distingue una respuesta que no es JSON de una caída de la conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 413,
        json: async () => {
          throw new Error('Unexpected token <');
        },
      })),
    );
    const resultado = await subirArchivo('/api/equipos/escudo', new FormData());
    expect(resultado).toMatchObject({ ok: false });
    expect((resultado as { mensaje: string }).mensaje).toContain('demasiado grande');
  });

  it('avisa de una caída real de la conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Failed to fetch');
      }),
    );
    const resultado = await subirArchivo('/api/equipos/escudo', new FormData());
    expect(resultado).toMatchObject({ ok: false, mensaje: 'No pudimos conectar. Probá de nuevo.' });
  });
});
