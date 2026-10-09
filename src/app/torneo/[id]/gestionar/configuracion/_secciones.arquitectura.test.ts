import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SECCIONES_CONFIGURACION } from './_secciones';

/**
 * El menú de Configuración y las pantallas que ofrece son dos cosas
 * distintas —una lista de títulos y un directorio de rutas— y nada en
 * el lenguaje las ata: una fila cuyo `page.tsx` no existe es un 404 que
 * solo aparece al tocarla, y una sección sin fila es una pantalla a la
 * que no se llega desde ningún lado.
 *
 * Las dos direcciones importan, así que las dos se verifican.
 */

const AQUI = __dirname;
const claves = Object.keys(SECCIONES_CONFIGURACION);

const directoriosConPagina = readdirSync(AQUI).filter(
  (nombre) =>
    statSync(join(AQUI, nombre)).isDirectory() && existsSync(join(AQUI, nombre, 'page.tsx')),
);

describe('cada sección de Configuración tiene su pantalla, y al revés', () => {
  it('el catálogo no está vacío (si esto falla, el recorrido está mal)', () => {
    expect(claves.length).toBeGreaterThan(0);
  });

  it.each(claves)('la sección "%s" tiene page.tsx', (clave) => {
    expect(
      existsSync(join(AQUI, clave, 'page.tsx')),
      `El menú ofrece "${clave}" pero no existe configuracion/${clave}/page.tsx: la fila lleva a un 404.`,
    ).toBe(true);
  });

  it.each(directoriosConPagina)('la pantalla "%s" está en el menú', (directorio) => {
    expect(
      claves.includes(directorio),
      `Existe configuracion/${directorio}/page.tsx pero el menú no lo ofrece: no se llega desde ningún lado. ` +
        'Sumalo a SECCIONES_CONFIGURACION.',
    ).toBe(true);
  });
});
