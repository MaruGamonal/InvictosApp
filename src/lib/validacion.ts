import type { ZodSchema, ZodError } from 'zod';
import { crearError } from './errores';

/**
 * Valida la entrada de un servicio contra un esquema tipado, en el borde
 * (`10`, 2.10 / T5). Un servicio nunca confía en su entrada: si no valida,
 * lanza `DATOS_INVALIDOS` con el detalle de qué campo falló.
 */
export function validarEntrada<T>(schema: ZodSchema<T>, input: unknown): T {
  const resultado = schema.safeParse(input);
  if (!resultado.success) {
    throw crearError('DATOS_INVALIDOS', formatearErroresDeValidacion(resultado.error));
  }
  return resultado.data;
}

function formatearErroresDeValidacion(error: ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || '(raíz)',
    problema: issue.message,
  }));
}
