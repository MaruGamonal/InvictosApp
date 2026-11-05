import { afterEach, describe, expect, it, vi } from 'vitest';
import { AMBIENTES, esAmbienteDePruebas, obtenerAmbiente } from './ambiente';

afterEach(() => vi.unstubAllEnvs());

describe('obtenerAmbiente', () => {
  it('con la variable en "pruebas", es pruebas', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'pruebas');
    expect(obtenerAmbiente()).toBe('pruebas');
    expect(esAmbienteDePruebas()).toBe(true);
  });

  /**
   * El default importa más que el caso feliz. Si la variable falta, se
   * escribe mal o alguien la borra, lo que tiene que pasar es lo
   * conservador: producción. Al revés, el accidente es datos de mentira
   * mezclados con torneos de gente real.
   */
  it.each([
    ['sin la variable', undefined],
    ['vacía', ''],
    ['mal escrita', 'prueba'],
    ['con mayúscula', 'Pruebas'],
    ['con espacios', ' pruebas '],
    ['otra cosa', 'staging'],
    ['la palabra producción', 'produccion'],
  ])('%s → producción', (_caso, valor) => {
    if (valor === undefined) vi.stubEnv('NEXT_PUBLIC_AMBIENTE', '');
    else vi.stubEnv('NEXT_PUBLIC_AMBIENTE', valor);
    expect(obtenerAmbiente()).toBe('produccion');
    expect(esAmbienteDePruebas()).toBe(false);
  });

  it('no hay más ambientes que esos dos', () => {
    expect([...AMBIENTES]).toEqual(['produccion', 'pruebas']);
  });
});
