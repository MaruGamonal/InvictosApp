import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());

function archivoFalso(tipo: string, tamano: number): File {
  return new File([new Uint8Array(tamano)], 'archivo', { type: tipo });
}

describe('subirImagenPublica', () => {
  it('rechaza un tipo de archivo no soportado', async () => {
    vi.doMock('./supabase/admin', () => ({ obtenerClienteAdmin: () => ({}) }));
    const { subirImagenPublica } = await import('./almacenamiento');

    await expect(subirImagenPublica('perfiles/u-1', archivoFalso('application/pdf', 10))).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
  });

  it('rechaza un archivo de más de 5 MB', async () => {
    vi.doMock('./supabase/admin', () => ({ obtenerClienteAdmin: () => ({}) }));
    const { subirImagenPublica } = await import('./almacenamiento');

    await expect(
      subirImagenPublica('perfiles/u-1', archivoFalso('image/png', 6 * 1024 * 1024)),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('propaga el error si la subida falla', async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    vi.doMock('./supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ storage: { from: () => ({ upload }) } }),
    }));
    const { subirImagenPublica } = await import('./almacenamiento');

    await expect(
      subirImagenPublica('perfiles/u-1', archivoFalso('image/png', 10)),
    ).rejects.toMatchObject({ codigo: 'ERROR_INTERNO' });
  });

  it('sube el archivo y devuelve la URL pública', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/media/perfiles/u-1/1.png' } });
    vi.doMock('./supabase/admin', () => ({
      obtenerClienteAdmin: () => ({ storage: { from: () => ({ upload, getPublicUrl }) } }),
    }));
    const { subirImagenPublica } = await import('./almacenamiento');

    const url = await subirImagenPublica('perfiles/u-1', archivoFalso('image/png', 10));
    expect(url).toBe('https://cdn/media/perfiles/u-1/1.png');
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^perfiles\/u-1\/\d+\.png$/),
      expect.anything(),
      { contentType: 'image/png', upsert: false },
    );
  });
});
