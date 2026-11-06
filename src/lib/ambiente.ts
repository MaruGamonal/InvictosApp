/**
 * En qué ambiente está corriendo esto: el productivo o el de pruebas.
 *
 * **Una sola variable para las dos cosas que dependen de la respuesta.**
 * La aplicación la usa para mostrar la banda que avisa que los datos no
 * son reales; los scripts de datos demo la usan para negarse a correr
 * donde no corresponde. Con dos variables distintas, un día una dice
 * una cosa y la otra, otra — y el día que pase, el síntoma va a ser
 * datos `[DEMO]` en producción o una banda de pruebas en el sitio real.
 *
 * **El default es producción, a propósito.** Si la variable falta, está
 * mal escrita o alguien la borra, lo que pasa es lo conservador: no hay
 * banda, y `demo:sembrar` se niega a correr. Al revés —asumir pruebas
 * cuando no se sabe— el accidente es irreversible: datos de mentira
 * mezclados con torneos de gente real.
 *
 * Es `NEXT_PUBLIC_` porque la banda se renderiza en el cliente. No hay
 * nada que proteger acá: que el navegador sepa que está en el ambiente
 * de pruebas es justamente el punto.
 */

export type Ambiente = 'produccion' | 'pruebas';

export const AMBIENTES: readonly Ambiente[] = ['produccion', 'pruebas'];

export function obtenerAmbiente(): Ambiente {
  return process.env.NEXT_PUBLIC_AMBIENTE === 'pruebas' ? 'pruebas' : 'produccion';
}

export function esAmbienteDePruebas(): boolean {
  return obtenerAmbiente() === 'pruebas';
}

/**
 * Lo que la banda dice. Corto porque ocupa una franja arriba de todo, y
 * explícito sobre las dos cosas que alguien invitado a probar necesita
 * saber: que no es el sitio real y que lo que cargue se puede borrar.
 */
export const AVISO_DE_PRUEBAS = 'Ambiente de pruebas — los datos no son reales';
