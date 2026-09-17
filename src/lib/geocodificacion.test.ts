import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarDirecciones } from './geocodificacion';
import { reiniciarLimitesDeFrecuencia } from './limiteFrecuencia';

beforeEach(() => reiniciarLimitesDeFrecuencia());
afterEach(() => vi.unstubAllGlobals());

describe('buscarDirecciones', () => {
  it('mapea los resultados de Nominatim a direccion/latitud/longitud', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
          lat: '-32.9468',
          lon: '-60.6393',
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarDirecciones('Parque Sarmiento');

    expect(resultados).toEqual([
      {
        direccion: 'Cancha 3, Parque Sarmiento, Rosario, Argentina',
        latitud: -32.9468,
        longitud: -60.6393,
      },
    ]);
    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('nominatim.openstreetmap.org/search');
    expect(String(url)).toContain('countrycodes=ar');
    expect((opciones as RequestInit).headers).toMatchObject({
      'User-Agent': expect.stringContaining('InvictaApp'),
    });
  });

  it('si Nominatim responde con error HTTP, devuelve lista vacía sin tirar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(buscarDirecciones('lo que sea')).resolves.toEqual([]);
  });

  it('si el fetch falla (red), devuelve lista vacía sin tirar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(buscarDirecciones('lo que sea')).resolves.toEqual([]);
  });

  it('supera el límite de frecuencia de toda la app, devuelve lista vacía sin llamar a fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    await buscarDirecciones('a');
    await buscarDirecciones('b');
    const resultado = await buscarDirecciones('c');

    expect(resultado).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
