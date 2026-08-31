import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validarEntrada } from './validacion';
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
