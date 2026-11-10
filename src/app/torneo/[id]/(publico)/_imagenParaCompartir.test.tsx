import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_datos', () => ({
  obtenerFichaOFallar: vi.fn(async () => ({
    nombre: 'Copa Otoño F5 Banfield',
    modalidad: 'f5',
    categoriaGenero: 'mixed',
    ciudad: { id: 'c', nombre: 'Banfield' },
    estado: 'registration_open',
    equiposAprobados: 3,
    cupoEquipos: 8,
    organizacion: { id: 'o', nombre: 'Liga Amateur del Sur', nivelVerificacion: 'basic' },
    imagenUrl: 'https://imagenes.invalid/escudo.png',
  })),
}));

import { dibujarImagenDelTorneo, TAMANO } from './_imagenParaCompartir';

afterEach(() => vi.unstubAllGlobals());

/**
 * La imagen al compartir un torneo (`08`, 11.4). Lo que se cuida acá es
 * que siempre salga: un link sin vista previa es peor que una vista
 * previa sin la foto del torneo.
 */
describe('la imagen para compartir un torneo', () => {
  it('es un PNG de 1200×630, el tamaño que leen las apps de mensajería', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    const respuesta = await dibujarImagenDelTorneo('id-del-torneo');
    expect(TAMANO).toEqual({ width: 1200, height: 630 });
    expect(respuesta.headers.get('content-type')).toBe('image/png');
    const png = Buffer.from(await respuesta.arrayBuffer());
    // Ancho y alto, en la cabecera IHDR del PNG.
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it('si la imagen propia del torneo no se puede bajar, sale igual sin ella', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('sin red');
      }),
    );
    const respuesta = await dibujarImagenDelTorneo('id-del-torneo');
    expect(respuesta.status).toBe(200);
    expect((await respuesta.arrayBuffer()).byteLength).toBeGreaterThan(1000);
  });

  it('no usa una imagen que no sea PNG o JPEG (el dibujante no la entiende)', async () => {
    const fetchFalso = vi.fn(
      async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }),
    );
    vi.stubGlobal('fetch', fetchFalso);
    const respuesta = await dibujarImagenDelTorneo('id-del-torneo');
    expect(fetchFalso).toHaveBeenCalledOnce();
    expect(respuesta.status).toBe(200);
  });
});
