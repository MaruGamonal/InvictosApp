import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { esIdentificador, validarEntrada } from './validacion';
import { esErrorDeAplicacion } from './errores';

const esquema = z.object({
  nombreVisible: z.string().min(1),
  edad: z.number().int().optional(),
});

describe('validarEntrada', () => {
  it('devuelve la entrada tipada cuando es válida', () => {
    const resultado = validarEntrada(esquema, { nombreVisible: 'Juan' });
    expect(resultado).toEqual({ nombreVisible: 'Juan' });
  });

  it('rechaza con DATOS_INVALIDOS y el detalle nombrando el campo que falta', () => {
    expect.assertions(3);
    try {
      validarEntrada(esquema, {});
    } catch (error) {
      if (!esErrorDeAplicacion(error)) throw error;
      expect(error.codigo).toBe('DATOS_INVALIDOS');
      expect(Array.isArray(error.detalle)).toBe(true);
      expect(error.detalle).toEqual(
        expect.arrayContaining([expect.objectContaining({ campo: 'nombreVisible' })]),
      );
    }
  });

  it('rechaza cuando el tipo del campo es el equivocado', () => {
    expect.assertions(1);
    try {
      validarEntrada(esquema, { nombreVisible: 'Juan', edad: 'no es un número' });
    } catch (error) {
      if (!esErrorDeAplicacion(error)) throw error;
      expect(error.codigo).toBe('DATOS_INVALIDOS');
    }
  });
});

/**
 * Los ids viajan en la URL, así que cualquiera puede pedir
 * `/equipo/cualquier-cosa`. Antes ese texto llegaba hasta Postgres, que
 * lo rechaza por no ser un UUID, y la página respondía 500 en vez de su
 * 404.
 */
describe('esIdentificador', () => {
  it('acepta un UUID, en minúscula o mayúscula', () => {
    expect(esIdentificador('2f737a62-798b-448b-b329-f7eab8b79838')).toBe(true);
    expect(esIdentificador('2F737A62-798B-448B-B329-F7EAB8B79838')).toBe(true);
  });

  it.each([
    ['texto suelto', 'abc'],
    ['vacío', ''],
    ['sin guiones', '2f737a62798b448bb329f7eab8b79838'],
    ['con un carácter de más', '2f737a62-798b-448b-b329-f7eab8b798381'],
    ['con una letra fuera del rango hexadecimal', '2f737a62-798b-448b-b329-f7eab8b7983z'],
    ['con espacios alrededor', ' 2f737a62-798b-448b-b329-f7eab8b79838 '],
  ])('rechaza %s', (_caso, valor) => {
    expect(esIdentificador(valor)).toBe(false);
  });
});
