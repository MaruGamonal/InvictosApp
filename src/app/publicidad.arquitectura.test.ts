import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * T24 — "Exactamente tres superficies" llevan publicidad (`06`, D-63):
 * `/torneos`, `/torneo/[id]` y `/torneo/[id]/fixture`. Ninguna otra ruta
 * pública, y ninguna ruta con sesión, la lleva nunca — en particular
 * ninguno de los flujos del organizador. Esta prueba es la verificación
 * automática que el propio ticket pide: recorre todas las páginas de
 * `src/app` y hace cumplir que `<ContenedorPublicidad` solo aparezca en
 * las tres rutas habilitadas.
 */

const APP_DIR = join(__dirname);

const RUTAS_HABILITADAS = new Set([
  'torneos/page.tsx',
  'torneo/[id]/page.tsx',
  'torneo/[id]/fixture/page.tsx',
]);

/** `/catalogo` es la galería interna de componentes (T6), no una superficie del producto: exhibe todos, este incluido. */
const EXCEPCIONES = new Set(['catalogo/page.tsx']);

function listarPaginas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarPaginas(ruta);
    return nombre === 'page.tsx' ? [ruta] : [];
  });
}

describe('el componente de publicidad no aparece fuera de las tres rutas habilitadas', () => {
  const paginas = listarPaginas(APP_DIR);

  it('hay páginas para revisar (si esto falla, el glob está mal)', () => {
    expect(paginas.length).toBeGreaterThan(0);
  });

  it.each(paginas)('%s', (pagina) => {
    const rutaRelativa = relative(APP_DIR, pagina);
    if (EXCEPCIONES.has(rutaRelativa)) return;

    const contenido = readFileSync(pagina, 'utf8');
    const llevaPublicidad = /<ContenedorPublicidad\b/.test(contenido);

    if (RUTAS_HABILITADAS.has(rutaRelativa)) {
      expect(
        llevaPublicidad,
        `${rutaRelativa} es una de las tres rutas habilitadas y no está usando <ContenedorPublicidad>`,
      ).toBe(true);
    } else {
      expect(
        llevaPublicidad,
        `${rutaRelativa} no es una de las tres rutas habilitadas (\`06\`, D-63) y no puede usar <ContenedorPublicidad>`,
      ).toBe(false);
    }
  });

  it('las tres rutas habilitadas existen de verdad', () => {
    const rutasEncontradas = new Set(paginas.map((pagina) => relative(APP_DIR, pagina)));
    for (const ruta of RUTAS_HABILITADAS) {
      expect(rutasEncontradas.has(ruta), `no se encontró la página ${ruta}`).toBe(true);
    }
  });
});
