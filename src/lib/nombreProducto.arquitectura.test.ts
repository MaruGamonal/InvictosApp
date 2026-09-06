import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Revisión 15, sección 3.6 de `LEEME.md`: "el nombre del producto vive
 * en una constante y en los textos de interfaz, nunca desparramado".
 * La marca no es registrable (`06`, D-97) y puede tener que revisarse
 * antes de formalizar — concentrar el nombre acá es lo que convierte
 * ese eventual cambio en una línea, no en una migración por todo
 * `src/`. Esta prueba hace cumplir la regla en vez de confiar en que se
 * respete por acuerdo verbal.
 */

const SRC_DIR = join(__dirname, '..');
const ARCHIVO_PERMITIDO = 'lib/nombreProducto.ts';

function listarArchivosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarArchivosDeCodigo(ruta);
    if (!/\.(ts|tsx)$/.test(ruta) || ruta.endsWith('.test.ts') || ruta.endsWith('.test.tsx')) {
      return [];
    }
    return [ruta];
  });
}

describe('el nombre del producto no aparece desparramado por el código', () => {
  const archivos = listarArchivosDeCodigo(SRC_DIR).filter(
    (archivo) => relative(SRC_DIR, archivo) !== ARCHIVO_PERMITIDO,
  );

  it('hay archivos para revisar (si esto falla, el glob está mal)', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)('%s', (archivo) => {
    const contenido = readFileSync(archivo, 'utf8');
    expect(
      /INVICTA/.test(contenido),
      `${archivo} tiene el nombre del producto escrito a mano — tiene que usar NOMBRE_PRODUCTO o conNombreProducto() de src/lib/nombreProducto.ts`,
    ).toBe(false);
  });
});
