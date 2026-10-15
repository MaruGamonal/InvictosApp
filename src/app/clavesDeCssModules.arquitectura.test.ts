import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * Toda clase que un componente use de su módulo CSS tiene que existir
 * en ese archivo.
 *
 * **Por qué hace falta un test.** `styles.loQueSea` sobre una clase que
 * no está devuelve `undefined`, React lo renderiza como "sin clase", y
 * el elemento sale sin estilo. Ni TypeScript ni el build tienen nada
 * que decir: los módulos CSS se tipan como `Record<string, string>`.
 * Lo único que lo delata es mirar la pantalla sabiendo cómo tenía que
 * verse — el mismo agujero que el de los tokens inexistentes
 * (`tokensDeCss.arquitectura.test.ts`), una capa más arriba.
 *
 * Pasó: `BotonPedirSumarme` mostraba su mensaje de error con
 * `styles.mensajeError`, que no estaba definido en
 * `BotonSeguir.module.css`.
 *
 * Los accesos calculados (`styles[algo]`) no se revisan: no se puede
 * saber la clave sin ejecutar. Son pocos y deliberados.
 */

const RAIZ = join(__dirname, '..');

function listarFuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarFuentes(ruta);
    if (nombre.includes('.test.')) return [];
    return nombre.endsWith('.tsx') || nombre.endsWith('.ts') ? [ruta] : [];
  });
}

/** `import algo from './X.module.css'`, con o sin alias. */
const IMPORT_CSS = /import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g;

function clasesDe(archivoCss: string): Set<string> {
  const fuente = readFileSync(archivoCss, 'utf8');
  return new Set([...fuente.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]!));
}

/** Cuántos pares componente+módulo llegó a revisar, para que el test no
    pueda pasar porque no miró nada. */
let revisados = 0;

const faltantes = listarFuentes(RAIZ).flatMap((ruta) => {
  const fuente = readFileSync(ruta, 'utf8');
  const problemas: string[] = [];

  for (const [, alias, rutaCss] of fuente.matchAll(IMPORT_CSS)) {
    const absoluta = rutaCss!.startsWith('@/')
      ? join(RAIZ, rutaCss!.slice(2))
      : resolve(dirname(ruta), rutaCss!);
    if (!existsSync(absoluta)) {
      problemas.push(`importa ${rutaCss}, que no existe`);
      continue;
    }
    revisados += 1;
    const definidas = clasesDe(absoluta);
    const usadas = [...fuente.matchAll(new RegExp(`\\b${alias}\\.([a-zA-Z][\\w]*)`, 'g'))].map(
      (m) => m[1]!,
    );
    for (const clase of new Set(usadas)) {
      if (!definidas.has(clase)) {
        problemas.push(`usa ${alias}.${clase}, que no está en ${rutaCss}`);
      }
    }
  }

  return problemas.length > 0
    ? [{ archivo: relative(RAIZ, ruta).split('\\').join('/'), problemas }]
    : [];
});

describe('ningún componente usa una clase de CSS que no existe', () => {
  it('hay componentes con módulo CSS para revisar (si esto falla, el barrido está mal)', () => {
    expect(revisados).toBeGreaterThan(50);
  });

  it('no hay clases huérfanas', () => {
    expect(
      faltantes,
      faltantes.map(({ archivo, problemas }) => `${archivo} ${problemas.join('; ')}`).join('\n') +
        '\n\nUna clase inexistente no rompe: el elemento sale sin estilo, en silencio.',
    ).toEqual([]);
  });
});
