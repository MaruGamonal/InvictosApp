import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Un componente de cliente puede tomar **tipos** de un servicio, pero no
 * valores.
 *
 * `import type` se borra al compilar; un `import` normal arrastra el
 * módulo entero al bundle del navegador, y con él `obtenerPool`,
 * `next/cache` y todo lo que el servicio importe. Reportado en vivo:
 * `PanelResultados` empezó a leer una constante de `cargarResultado`
 * para el `max` de un input y el build de producción se cayó con
 * "You're importing a component that needs revalidateTag".
 *
 * `npm test` no lo veía porque en el test el módulo carga sin problema:
 * solo aparecía en `npm run build`. Esto lo baja al suite rápido.
 */

const APP_DIR = __dirname;
const SRC_DIR = join(APP_DIR, '..');
const IMPORT_DE_SERVICIO = /^import\s+(?!type\s)[^;]*?from\s+'@\/services\//m;

function listarComponentesDeCliente(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarComponentesDeCliente(ruta);
    if (!nombre.endsWith('.tsx') || nombre.includes('.test.')) return [];
    return readFileSync(ruta, 'utf8').startsWith("'use client'") ? [ruta] : [];
  });
}

const componentesDeCliente = [
  ...listarComponentesDeCliente(APP_DIR),
  ...listarComponentesDeCliente(join(SRC_DIR, 'components')),
];

describe('los componentes de cliente no importan valores de los servicios', () => {
  it('hay componentes de cliente para revisar (si esto falla, el recorrido está mal)', () => {
    expect(componentesDeCliente.length).toBeGreaterThan(0);
  });

  it.each(componentesDeCliente)('%s', (ruta) => {
    const contenido = readFileSync(ruta, 'utf8');
    expect(
      IMPORT_DE_SERVICIO.test(contenido),
      `${relative(SRC_DIR, ruta)} importa un valor de @/services: mové la constante o la función a @/lib, ` +
        'o usá `import type` si solo necesitás el tipo',
    ).toBe(false);
  });
});
