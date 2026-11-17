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
 * Si los buscadores pueden indexar este ambiente.
 *
 * **El de pruebas no.** Tiene dominio propio y es público —los dueños
 * de los torneos entran sin cuenta de Vercel—, así que Google puede
 * llegar igual que cualquiera. Y lo que encontraría son torneos
 * `[DEMO]` inventados, en un sitio que es copia del real: contenido
 * duplicado compitiendo con `www`, y resultados de búsqueda con datos
 * de mentira bajo el nombre del producto.
 *
 * La protección automática de Vercel no cubre esto: el `noindex` que
 * pone en las vistas previas vale para las URL generadas
 * (`...vercel.app`), no para un dominio propio asignado a una rama.
 * Comprobado contra el sitio: no venía ninguna cabecera `x-robots-tag`.
 *
 * Se decide acá, y no en cada lugar que lo necesita, porque son dos
 * —`robots.txt` y la metadata de cada página— y tienen que decir lo
 * mismo. El default sigue siendo producción: si la variable falta, se
 * indexa, que es lo correcto para el sitio real.
 */
export function seIndexa(): boolean {
  return !esAmbienteDePruebas();
}

/**
 * Lo que va en `metadata.robots` de Next. `undefined` en producción
 * —no hay nada que declarar, el default de los buscadores es indexar—
 * y el bloqueo explícito en pruebas.
 *
 * Va además de `robots.txt` porque los dos hacen cosas distintas:
 * `robots.txt` pide no rastrear, y esto pide no mostrar en resultados.
 * Una página que alguien ya compartió por mensaje puede llegar a un
 * buscador sin pasar por el rastreo del sitio.
 */
export function robotsDeMetadata(): { index: false; follow: false } | undefined {
  return seIndexa() ? undefined : { index: false, follow: false };
}

/**
 * Lo que la banda dice. Corto porque ocupa una franja arriba de todo, y
 * explícito sobre las dos cosas que alguien invitado a probar necesita
 * saber: que no es el sitio real y que lo que cargue se puede borrar.
 */
export const AVISO_DE_PRUEBAS = 'Ambiente de pruebas — los datos no son reales';
