import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Todo `var(--token)` que use una hoja de estilos tiene que estar
 * definido.
 *
 * **Por qué hace falta un test.** Un token que no existe no rompe nada:
 * CSS resuelve `var(--inexistente)` a nada y la propiedad se cae a su
 * valor inicial. Un `background` queda transparente, un `color` hereda,
 * un `border` desaparece — todo sin una advertencia, sin un error de
 * build y sin que los tipos tengan nada que decir. Lo único que lo
 * delata es mirar la pantalla, y solo si uno sabe cómo tenía que verse.
 *
 * Pasó: `--fondo-aplicacion` se usaba en dos lugares y no estaba
 * definido en ninguno. El botón de editar la alineación quedaba con el
 * gris del panel de fondo en vez del suyo.
 *
 * Un `var(--token, algo)` con respaldo explícito no cuenta: ahí la
 * ausencia es una decisión, no un olvido.
 */

const RAIZ = join(__dirname, '..');

function listarCss(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarCss(ruta);
    return nombre.endsWith('.css') ? [ruta] : [];
  });
}

const hojas = listarCss(RAIZ);
const definidos = new Set<string>();
for (const hoja of hojas) {
  for (const coincidencia of readFileSync(hoja, 'utf8').matchAll(/(--[\w-]+)\s*:/g)) {
    definidos.add(coincidencia[1]!);
  }
}

// `next/font` define los suyos en tiempo de ejecución, con la clase que
// pone en `<html>`: en el CSS no aparecen declarados en ningún lado,
// pero existen.
for (const coincidencia of readFileSync(join(RAIZ, 'app', 'layout.tsx'), 'utf8').matchAll(
  /variable:\s*'(--[\w-]+)'/g,
)) {
  definidos.add(coincidencia[1]!);
}

/** `var(--x)` sin respaldo. Con coma hay respaldo y la ausencia es deliberada. */
const USO_SIN_RESPALDO = /var\(\s*(--[\w-]+)\s*\)/g;

const usosHuerfanos = hojas.flatMap((hoja) => {
  const usados = [...readFileSync(hoja, 'utf8').matchAll(USO_SIN_RESPALDO)].map((m) => m[1]!);
  const huerfanos = [...new Set(usados)].filter((token) => !definidos.has(token));
  return huerfanos.length > 0
    ? [{ hoja: relative(RAIZ, hoja).split('\\').join('/'), huerfanos }]
    : [];
});

describe('ningún estilo usa un token que no existe', () => {
  it('hay hojas y tokens para revisar (si esto falla, el recorrido está mal)', () => {
    expect(hojas.length).toBeGreaterThan(0);
    expect(definidos.size).toBeGreaterThan(0);
  });

  it('no hay tokens huérfanos', () => {
    expect(
      usosHuerfanos,
      usosHuerfanos
        .map(({ hoja, huerfanos }) => `${hoja} usa ${huerfanos.join(', ')}, que no existe`)
        .join('\n') +
        '\n\nUn token inexistente no rompe: la propiedad se cae a su valor inicial, en silencio. ' +
        'Definilo en globals.css o usá el que corresponda.',
    ).toEqual([]);
  });
});
