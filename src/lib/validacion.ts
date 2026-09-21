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

/**
 * Si un segmento de URL tiene forma de identificador. Los ids del
 * producto son UUID y viajan en la URL, así que cualquiera puede pedir
 * `/equipo/cualquier-cosa`: eso llegaba hasta Postgres, que rechaza el
 * texto por no ser un UUID, y la página moría con un 500 en vez de
 * mostrar su 404. Además llenaba el registro de errores con URLs que
 * solo prueba un buscador.
 *
 * Va acá y no en un esquema de servicio porque el que tiene que decidir
 * es el borde: para una página, un id con forma inválida no es un dato
 * mal formado sino una dirección que no existe.
 */
const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esIdentificador(valor: string): boolean {
  return FORMA_UUID.test(valor);
}
