/**
 * El texto que se le muestra a la persona cuando una llamada a la API
 * falla, sacado de la respuesta misma (`10`, 2.4: `{ ok: false, error:
 * { codigo, mensaje, detalle } }`).
 *
 * Existe porque descartar lo que mandó el servidor y poner un genérico
 * en su lugar costó caro en vivo: el límite de reenvíos del enlace de
 * confirmación responde «Demasiados intentos. Probá de nuevo más
 * tarde.» y el aviso mostraba «No pudimos reenviarlo. Probá de nuevo.»
 * — que es lo contrario de lo que había que hacer.
 *
 * El orden va de lo más preciso a lo más general: el `problema` del
 * primer detalle (donde viajan los motivos puntuales), después el
 * `mensaje` del error, y recién al final el genérico que recibe por
 * parámetro.
 */
export function motivoDelFallo(cuerpo: unknown, generico: string): string {
  const error = (cuerpo as { error?: { mensaje?: unknown; detalle?: unknown } } | null)?.error;
  const primerDetalle = Array.isArray(error?.detalle) ? error.detalle[0] : null;
  const problema = (primerDetalle as { problema?: unknown } | null)?.problema;
  if (typeof problema === 'string' && problema !== '') return problema;
  if (typeof error?.mensaje === 'string' && error.mensaje !== '') return error.mensaje;
  return generico;
}
