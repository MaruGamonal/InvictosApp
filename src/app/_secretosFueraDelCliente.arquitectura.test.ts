import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

/**
 * Ningún módulo cliente puede llegar —ni directo ni a través de otro—
 * a un módulo que lea un secreto del entorno.
 *
 * **Por qué.** Lo que Next mete en el bundle del navegador es todo lo
 * que un módulo `'use client'` alcanza por sus imports. Sólo inlinea
 * los valores de las variables `NEXT_PUBLIC_`, así que un secreto no
 * se filtraría con su valor; pero el módulo que lo lee **sí viaja**, y
 * con él la forma de la consulta, los nombres de tabla y el nombre de
 * la variable. Es un mapa del servidor servido al público, y es la
 * antesala del error que sí importa.
 *
 * Esto se escribió el día que apareció el de verdad: el rol `anon` de
 * Supabase tenía `SELECT, INSERT, UPDATE, DELETE, TRUNCATE` sobre
 * todas las tablas, alcanzable con la anon key, que viaja en el
 * bundle. Buscando si había más de esa familia salió que no — pero la
 * búsqueda fue a mano, y a mano se hace una vez.
 *
 * **`import type` no cuenta.** TypeScript lo borra al compilar, así
 * que no llega nada. La primera versión de este barrido no los
 * distinguía y marcó quince módulos, los quince falsos: `PestanasGestion`
 * importando `type PendientesPorPestana`, y así. Un barrido que grita
 * por todo es un barrido que se apaga.
 */

const SRC = join(__dirname, '..');
const SECRETOS = ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'RESEND_API_KEY'];

function listar(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listar(ruta);
    if (nombre.includes('.test.')) return [];
    return ruta.endsWith('.ts') || ruta.endsWith('.tsx') ? [ruta] : [];
  });
}

const ARCHIVOS = listar(SRC);
const FUENTE = new Map(ARCHIVOS.map((ruta) => [ruta, readFileSync(ruta, 'utf8')]));

function resolverImport(desde: string, especificador: string): string | null {
  const base = especificador.startsWith('@/')
    ? join(SRC, especificador.slice(2))
    : especificador.startsWith('.')
      ? resolve(dirname(desde), especificador)
      : null;
  if (!base) return null;
  for (const sufijo of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (FUENTE.has(base + sufijo)) return base + sufijo;
  }
  return FUENTE.has(base) ? base : null;
}

/** Los imports que **sobreviven a la compilación**: sin `import type`. */
function importsDeValor(ruta: string): string[] {
  const fuente = FUENTE.get(ruta)!;
  const destinos: string[] = [];
  for (const linea of fuente.matchAll(/^\s*import\s+([\s\S]*?)from\s+'([^']+)';/gm)) {
    const cuerpo = linea[1]!;
    if (/^\s*type\s/.test(cuerpo)) continue; // `import type { X } from`
    // `import { type A, type B } from`: si todo es tipo, también se borra.
    const llaves = /\{([^}]*)\}/.exec(cuerpo);
    if (llaves && !cuerpo.replace(llaves[0], '').trim()) {
      const partes = llaves[1]!
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (partes.length > 0 && partes.every((p) => p.startsWith('type '))) continue;
    }
    const destino = resolverImport(ruta, linea[2]!);
    if (destino) destinos.push(destino);
  }
  return destinos;
}

function leeSecretos(ruta: string): string[] {
  const fuente = FUENTE.get(ruta)!;
  return SECRETOS.filter((variable) => fuente.includes(`process.env.${variable}`));
}

const CLIENTES = ARCHIVOS.filter((ruta) =>
  FUENTE.get(ruta)!.trimStart().startsWith("'use client'"),
);

interface Hallazgo {
  cliente: string;
  camino: string[];
  variables: string[];
}

function buscarSecreto(cliente: string): Hallazgo | null {
  const visto = new Set<string>();
  const pila: Array<[string, string[]]> = [[cliente, [cliente]]];
  while (pila.length > 0) {
    const [actual, camino] = pila.pop()!;
    if (visto.has(actual)) continue;
    visto.add(actual);
    const variables = leeSecretos(actual);
    if (variables.length > 0) {
      return { cliente, camino: camino.map((r) => relative(SRC, r)), variables };
    }
    for (const siguiente of importsDeValor(actual)) pila.push([siguiente, [...camino, siguiente]]);
  }
  return null;
}

describe('ningún módulo cliente alcanza un secreto del entorno', () => {
  it('hay módulos cliente para revisar (si esto falla, el barrido está mal)', () => {
    expect(CLIENTES.length).toBeGreaterThan(50);
  });

  it('el barrido sigue los imports de valor de verdad', () => {
    // Control: si no siguiera nada, el test de abajo pasaría vacío. Se
    // verifica contra un módulo cliente que sí importa algo real.
    const conImports = CLIENTES.filter((c) => importsDeValor(c).length > 0);
    expect(conImports.length).toBeGreaterThan(20);
  });

  it.each(SECRETOS)('ningún cliente llega a un módulo que lea %s', (variable) => {
    const hallazgos = CLIENTES.map(buscarSecreto).filter(
      (h): h is Hallazgo => h !== null && h.variables.includes(variable),
    );
    expect(
      hallazgos.map((h) => `${h.camino.join(' → ')}  [${h.variables.join(', ')}]`),
      'Ese módulo y todo lo que arrastra viajan al navegador. Separá lo que lee el secreto, o importá sólo el tipo.',
    ).toEqual([]);
  });
});
