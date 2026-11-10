import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Todo formateo de fecha declara su zona horaria (`zonaHoraria.ts`).
 *
 * Por qué hace falta un test. Sin `timeZone`, `toLocaleDateString` usa
 * la zona del proceso, y nada lo delata: en una computadora en Argentina
 * se ve bien. En el servidor —UTC— un partido de las 15:00 se mostraba a
 * las 18:00 y uno de las 22:00 caía en el día siguiente. Pasó en las
 * catorce pantallas que formatean fechas.
 *
 * Y si muestra la hora, en formato de 24 horas ("18:00", como el brief):
 * sin `hourCycle`, `es-AR` daba "06:00 p. m.".
 */
const RAIZ = join(__dirname, '..');
const FORMATEO =
  /(toLocaleDateString|toLocaleTimeString|toLocaleString|DateTimeFormat)\(\s*'es-AR'\s*(,\s*\{([\s\S]*?)\})?\s*\)/g;

function listar(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listar(ruta);
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

const problemas = listar(RAIZ).flatMap((archivo) => {
  const codigo = readFileSync(archivo, 'utf8');
  return [...codigo.matchAll(FORMATEO)].flatMap((m) => {
    // `toLocaleString` sobre un número (p. ej. la cantidad de seguidores)
    // no es una fecha: sin opciones de fecha, no aplica.
    const opciones = m[3] ?? '';
    if (m[1] === 'toLocaleString' && !/day|month|hour|weekday/.test(opciones)) return [];
    const donde = relative(RAIZ, archivo).split('\\').join('/');
    const faltas: string[] = [];
    if (!/timeZone/.test(opciones)) faltas.push(`${donde}: formatea una fecha sin timeZone`);
    if (/hour/.test(opciones) && !/hourCycle/.test(opciones)) {
      faltas.push(`${donde}: muestra la hora sin hourCycle: 'h23'`);
    }
    return faltas;
  });
});

describe('zona horaria de las fechas', () => {
  it('todo formateo de fecha declara timeZone, y hourCycle si muestra la hora', () => {
    expect(problemas).toEqual([]);
  });
});
