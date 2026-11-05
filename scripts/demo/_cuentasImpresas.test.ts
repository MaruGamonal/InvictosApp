import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { emailDemo } from './_identidad';

/**
 * Las cuentas que el seed imprime al terminar son las que creó.
 *
 * Pasó: la lista estaba escrita a mano y decía
 * `demo.organizador@demo.invicta.com.ar` cuando la cuenta creada es
 * `organizador@demo.invicta.com.ar`. Un `demo.` de más. El seed
 * terminaba en verde, el dataset estaba perfecto, y el error sólo
 * aparecía cuando alguien intentaba entrar con lo que le habías
 * pasado — con la peor forma posible de enterarse, que es un dueño de
 * torneo escribiéndote que no puede entrar.
 *
 * La defensa de fondo es que ahora se imprime desde los usuarios
 * creados. Esto impide que alguien vuelva a escribir una a mano.
 */

const FUENTE = readFileSync(join(__dirname, 'sembrar.ts'), 'utf8');

/**
 * Sin comentarios: que la documentación nombre el dominio está bien —
 * de hecho es donde se explica por qué `limpiar.ts` puede borrar sin
 * adivinar—. Lo que no puede haber es un mail escrito a mano en el
 * código que se imprime.
 */
const CODIGO = FUENTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('las cuentas que imprime el seed', () => {
  it('no hay ningún mail demo escrito a mano en el código', () => {
    // Cualquier literal con el dominio demo adentro: el seed tiene que
    // armarlos con `emailDemo`, nunca escribirlos.
    const literales = [...CODIGO.matchAll(/'[^']*@demo\.invicta\.com\.ar[^']*'/g)].map(
      (coincidencia) => coincidencia[0],
    );
    expect(
      literales,
      'Un mail demo escrito a mano se desactualiza sin que nada falle. Armalo con emailDemo() o imprimí el .email del usuario creado.',
    ).toEqual([]);
  });

  it('imprime recorriendo los usuarios creados, no una lista fija', () => {
    expect(FUENTE).toContain('persona.email');
  });

  /** Y que el dominio siga siendo el que limpia `limpiar.ts`. */
  it('emailDemo arma el mail con el dominio que la limpieza busca', () => {
    expect(emailDemo('organizador')).toBe('organizador@demo.invicta.com.ar');
  });
});
