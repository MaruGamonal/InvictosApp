import { describe, expect, it } from 'vitest';
import { verificarOrdenDeFechas } from './_fechas';

/**
 * Se podía guardar un torneo que empieza el 30/09 y termina el 22/09.
 * Con las dos fechas cargadas la duración decide si el torneo es
 * relámpago, así que una diferencia negativa cambia cómo se calculan los
 * plazos de confirmación.
 */
describe('verificarOrdenDeFechas', () => {
  const INICIO = '2026-09-30T00:00:00.000Z';

  it('rechaza un fin anterior al inicio', () => {
    expect(() => verificarOrdenDeFechas(INICIO, '2026-09-22T00:00:00.000Z')).toThrow();
  });

  it('acepta un fin posterior', () => {
    expect(() => verificarOrdenDeFechas(INICIO, '2026-10-05T00:00:00.000Z')).not.toThrow();
  });

  /** Un torneo de un solo día empieza y termina el mismo día. */
  it('acepta el mismo instante', () => {
    expect(() => verificarOrdenDeFechas(INICIO, INICIO)).not.toThrow();
  });

  it.each([
    ['sin fin', INICIO, null],
    ['sin inicio', null, INICIO],
    ['sin ninguna', null, null],
    ['con undefined', undefined, undefined],
  ])('no opina cuando falta alguna fecha (%s)', (_caso, inicio, fin) => {
    expect(() => verificarOrdenDeFechas(inicio, fin)).not.toThrow();
  });

  it('compara fechas que llegan como Date, no solo como texto', () => {
    expect(() => verificarOrdenDeFechas(new Date(INICIO), new Date('2026-09-22'))).toThrow();
  });
});
