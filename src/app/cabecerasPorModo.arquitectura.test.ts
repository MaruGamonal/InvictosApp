import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * La banda de cabecera de una pantalla usa **el color de su modo**, y
 * no un fondo oscuro cualquiera.
 *
 * Por qué hace falta un test. Esto ya se desparramó una vez: de las
 * diez cabeceras de la aplicación, cinco usaban el degradé
 * `--identidad-fondo` y cinco `--ink-900` plano, repartidas sin ningún
 * criterio — `/equipos` de una forma, `/equipo/[id]` de la otra— y
 * `CabeceraDeModo` usaba el mismo fondo en los dos modos, así que el
 * color no decía nada. Nada falla cuando esto pasa: cada pantalla se
 * ve bien sola. Sólo se nota navegando, que es justo lo que ningún
 * test hace.
 *
 * La regla es una sola: si un selector es la cabecera de una pantalla
 * y pinta un fondo, ese fondo es `--cabecera-jugador` o
 * `--cabecera-organizador`.
 *
 * Lo que **no** entra son las superficies oscuras adentro de una
 * pantalla clara —el marcador, la tarjeta del próximo partido—: ésas
 * son `--identidad-fondo` y no cambian con el modo, porque un marcador
 * es del partido, no de quien mira.
 */

const RAIZ = join(__dirname, '..');
const PERMITIDOS = ['--cabecera-jugador', '--cabecera-organizador'];

/** `.hero`, `.cabecera`, `.cabeceraJugador`… y no `.heroTitulo`. */
const ES_CABECERA = /^\.(hero|cabecera)([A-Z]\w*)?\s*\{/;

function listarModulos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarModulos(ruta);
    return nombre.endsWith('.module.css') ? [ruta] : [];
  });
}

interface Hallazgo {
  archivo: string;
  selector: string;
  fondo: string;
}

const revisados: string[] = [];
const fuera: Hallazgo[] = [];

for (const ruta of listarModulos(RAIZ)) {
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  let selector: string | null = null;

  for (const linea of lineas) {
    if (ES_CABECERA.test(linea.trim())) {
      selector = linea.trim().replace(/\s*\{.*/, '');
      continue;
    }
    if (selector && linea.trim() === '}') {
      selector = null;
      continue;
    }
    if (!selector) continue;

    const fondo = /^\s*background(-color)?:\s*(.+?);/.exec(linea);
    if (!fondo) continue;

    const valor = fondo[2]!;
    const archivo = relative(RAIZ, ruta).split('\\').join('/');
    revisados.push(`${archivo} ${selector}`);
    if (!PERMITIDOS.some((token) => valor.includes(token))) {
      fuera.push({ archivo, selector, fondo: valor });
    }
  }
}

/**
 * Las paradas de los dos degradés de cabecera, tal como están escritas
 * en `globals.css`.
 */
function paradasDelToken(token: string): string[] {
  const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');
  const linea = new RegExp(`${token}:\\s*([^;]+);`).exec(css);
  expect(linea, `${token} no está definido en globals.css`).not.toBeNull();
  return [...linea![1]!.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0]!);
}

function luminancia(hex: string): number {
  const canales = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canales[0]! + 0.7152 * canales[1]! + 0.0722 * canales[2]!;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (oscuro! + 0.05);
}

/** `--gris-claro-sobre-oscuro`, el texto secundario de las dos bandas. */
const TEXTO_SECUNDARIO = '#a9b4bc';

describe('cada cabecera usa el color de su modo', () => {
  it('hay cabeceras para revisar (si esto falla, el barrido está mal)', () => {
    expect(revisados.length).toBeGreaterThanOrEqual(9);
  });

  it('ninguna pinta un fondo que no sea el de su modo', () => {
    expect(
      fuera,
      fuera.map((f) => `${f.archivo} ${f.selector} → ${f.fondo}`).join('\n') +
        `\n\nUsá ${PERMITIDOS.join(' o ')}. Una superficie oscura que no sea la banda de` +
        ' cabecera no se llama .hero ni .cabecera: ésas van con --identidad-fondo.',
    ).toEqual([]);
  });

  /**
   * Elegir el color del organizador fue elegir hasta dónde llega el
   * teal, y el límite lo puso el contraste: el "Hola," va en
   * `--gris-claro-sobre-oscuro` a 13px sobre esta banda. La versión que
   * mejor se distinguía (#084c66 de parada final) daba 4.45:1 —
   * reprobaba AA por nada. Sin esto, cualquiera sube un punto el teal
   * más adelante y nadie se entera: en pantalla se ve bien igual.
   */
  it.each(PERMITIDOS)('%s deja legible el texto secundario en todas sus paradas', (token) => {
    const paradas = paradasDelToken(token);
    expect(paradas.length).toBeGreaterThan(0);
    for (const parada of paradas) {
      const ratio = contraste(TEXTO_SECUNDARIO, parada);
      expect(
        ratio,
        `${token}: sobre ${parada} el texto secundario queda en ${ratio.toFixed(2)}:1, abajo del 4.5:1 de AA`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
