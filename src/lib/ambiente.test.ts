import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AMBIENTES,
  esAmbienteDePruebas,
  obtenerAmbiente,
  robotsDeMetadata,
  seIndexa,
} from './ambiente';

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

describe('indexación', () => {
  it('producción se indexa y no declara nada en la metadata', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'produccion');
    expect(seIndexa()).toBe(true);
    expect(robotsDeMetadata()).toBeUndefined();
  });

  it('pruebas no se indexa, y lo dice en la metadata', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'pruebas');
    expect(seIndexa()).toBe(false);
    expect(robotsDeMetadata()).toEqual({ index: false, follow: false });
  });

  /**
   * Mismo default conservador que el resto del módulo: ante la duda, el
   * sitio real tiene que seguir siendo indexable. Una variable mal
   * escrita no puede sacar a producción de Google.
   */
  it('con la variable rota, se indexa', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'prueba');
    expect(seIndexa()).toBe(true);
  });
});
