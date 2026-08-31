/**
 * Límite de frecuencia (`10`, sección 9): para que crear cuentas y
 * organizaciones descartables no sea gratis ni cómodo (`06`, D-51). Se usa
 * en registro, envío de correos de verificación e inscripción.
 *
 * Implementación de ventana deslizante en memoria del proceso. Es
 * suficiente para el monolito de un solo proceso del MVP (`09`); si el
 * producto pasa a correr en más de una instancia a la vez, este estado
 * tiene que moverse a un almacén compartido (Redis, o una tabla) para
 * seguir siendo efectivo — hoy cada instancia contaría por separado.
 */

const intentosPorClave = new Map<string, number[]>();

export interface LimiteFrecuencia {
  /** Cuántos intentos se permiten dentro de la ventana. */
  maximoIntentos: number;
  /** Tamaño de la ventana, en milisegundos. */
  ventanaMs: number;
}

/**
 * Registra un intento para `clave` y devuelve si está permitido. Cuenta el
 * intento igual esté permitido o no: un intento rechazado también cuenta,
 * para que reintentar rápido no reinicie la ventana.
 */
export function verificarLimite(
  clave: string,
  limite: LimiteFrecuencia,
  ahora = Date.now(),
): boolean {
  const historial = intentosPorClave.get(clave) ?? [];
  const desde = ahora - limite.ventanaMs;
  const vigentes = historial.filter((marca) => marca > desde);
  vigentes.push(ahora);
  intentosPorClave.set(clave, vigentes);
  return vigentes.length <= limite.maximoIntentos;
}

/** Solo para tests: limpia el estado entre casos. */
export function reiniciarLimitesDeFrecuencia(): void {
  intentosPorClave.clear();
}
