import type { Contexto } from './contexto';

/**
 * Firma común de todo servicio (`10`, 2.1): `(input, contexto) -> resultado`.
 *
 * Un servicio nunca recibe objetos de petición ni de respuesta HTTP —eso lo
 * traduce la capa de rutas—, y es la misma firma que invocan la aplicación
 * web, las tareas programadas (con un contexto de sistema) y, a futuro, la
 * app nativa.
 */
export type Servicio<TInput, TResultado> = (
  input: TInput,
  contexto: Contexto,
) => Promise<TResultado>;
