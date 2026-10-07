import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Un módulo `'use client'` no exporta valores: solo componentes y tipos.
 *
 * **Por qué.** Al cruzar la frontera de servidor a cliente, Next no pasa
 * el valor: reemplaza cada export del módulo por una referencia que el
 * runtime de cliente resuelve después. Un componente sobrevive a eso
 * —justamente es lo que la referencia sabe renderizar—; un `Set`, un
 * `Map`, un array o una función suelta, no: del lado del servidor llega
 * un objeto proxy sin ninguno de sus métodos.
 *
 * Pasó: `ESTADOS_CON_ACCIONES_DE_ESTADO` se exportaba desde
 * `AccionesEstadoTorneo.tsx` (cliente) y lo importaba la página de
 * Configuración (servidor). `TypeError: …has is not a function`, en
 * producción, en la pantalla de un organizador.
 *
 * **Por qué hace falta un test y no alcanza con mirar.** Ni TypeScript ni
 * el build dicen nada: los tipos cruzan perfecto y `next build` compila
 * sin una advertencia. La frontera solo existe en tiempo de ejecución, y
 * los tests unitarios importan el módulo directamente, sin frontera
 * ninguna. O sea: el error no es visible en ningún lado hasta que
 * alguien abre la pantalla.
 *
 * **Qué hacer cuando esto falla.** Mover la constante a un módulo propio
 * sin `'use client'` y que la importen los dos lados. Eso funciona
 * siempre: un módulo sin directiva se compila para el entorno de quien
 * lo importa.
 *
 * El tipo es aparte: `export interface` y `export type` se borran al
 * compilar, así que nunca llegan a cruzar nada.
 */

const APP = join(__dirname);
const COMPONENTES = join(__dirname, '..', 'components');
const RAIZ = join(__dirname, '..');

function listarFuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarFuentes(ruta);
    if (nombre.includes('.test.')) return [];
    return nombre.endsWith('.tsx') || nombre.endsWith('.ts') ? [ruta] : [];
  });
}

const fuentes = [...listarFuentes(APP), ...listarFuentes(COMPONENTES)];
const deCliente = fuentes.filter((ruta) =>
  /^\s*['"]use client['"]/.test(readFileSync(ruta, 'utf8')),
);

/** `export const`, `export let`, `export var`, `export class`, `export function` que no sea componente. */
const EXPORT_DE_VALOR = /^export\s+(?:const|let|var|class)\s+(\w+)/gm;

describe('un módulo de cliente no exporta valores', () => {
  it('hay módulos de cliente para revisar (si esto falla, el recorrido está mal)', () => {
    expect(deCliente.length).toBeGreaterThan(0);
  });

  it.each(deCliente)('%s', (ruta) => {
    const fuente = readFileSync(ruta, 'utf8');
    const nombres = [...fuente.matchAll(EXPORT_DE_VALOR)].map((m) => m[1]);
    const relativa = relative(RAIZ, ruta).split('\\').join('/');

    expect(
      nombres,
      `${relativa} exporta ${nombres.join(', ')} desde un módulo 'use client'. ` +
        'Si lo importa un componente de servidor, no recibe el valor sino una ' +
        'referencia de cliente, y revienta en tiempo de ejecución sin que el ' +
        'build ni los tipos digan nada. Movelo a un módulo propio sin la ' +
        "directiva 'use client' y que lo importen los dos lados.",
    ).toEqual([]);
  });
});
