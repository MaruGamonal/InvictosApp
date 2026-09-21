import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Toda ruta que escriba en el almacenamiento tiene que haber comprobado
 * el permiso **antes** de escribir.
 *
 * No es una preferencia de estilo. Estas rutas subían el archivo y
 * recién después llamaban al servicio que comprueba el permiso, así que
 * el rechazo llegaba cuando el archivo ya estaba en el bucket público y
 * accesible por su URL: alcanzaba con tener sesión para escribir
 * archivos a nombre de cualquier equipo, organización o torneo. Una de
 * ellas no comprobaba nada en absoluto.
 *
 * Un regex no entiende el orden de ejecución, pero sí el orden del
 * texto, que acá alcanza: las cuatro rutas son lineales.
 */

const API_DIR = __dirname;
const SUBIDA = /subir(ImagenPublica|DocumentoPublico)\(/;
const COMPROBACION = /verificarPermiso(Equipo|Organizacion|Torneo)\(|verificarPuedeSubirAlEquipo\(/;

/** El perfil propio no tiene más dueño que quien tiene la sesión. */
const SIN_RECURSO_AJENO = new Set(['mi-perfil/foto/route.ts']);

function listarRutas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarRutas(ruta);
    return nombre === 'route.ts' ? [ruta] : [];
  });
}

const rutasQueSuben = listarRutas(API_DIR).filter((ruta) =>
  SUBIDA.test(readFileSync(ruta, 'utf8')),
);

describe('las rutas que suben archivos comprueban el permiso antes de escribir', () => {
  it('hay rutas de subida para revisar (si esto falla, el glob está mal)', () => {
    expect(rutasQueSuben.length).toBeGreaterThan(0);
  });

  it.each(rutasQueSuben)('%s', (ruta) => {
    const relativa = relative(API_DIR, ruta);
    const contenido = readFileSync(ruta, 'utf8');
    if (SIN_RECURSO_AJENO.has(relativa)) return;

    const posicionComprobacion = contenido.search(COMPROBACION);
    const posicionSubida = contenido.search(SUBIDA);

    expect(
      posicionComprobacion,
      `${relativa} sube un archivo sin comprobar antes el permiso sobre el recurso`,
    ).toBeGreaterThan(-1);
    expect(
      posicionComprobacion,
      `${relativa} comprueba el permiso después de subir: el archivo queda en el bucket aunque se rechace`,
    ).toBeLessThan(posicionSubida);
  });
});
