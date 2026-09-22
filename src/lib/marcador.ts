/**
 * Tope de goles por equipo en un partido. No había ninguno: un dedo de
 * más cargaba 999 goles y eso entraba a la tabla, a los goleadores y a
 * la ficha pública sin que nada lo frenara.
 *
 * Es un límite de producto, no técnico: la idea es que pase a depender
 * del plan del organizador, así que vive en una constante propia y no
 * suelto dentro del esquema de `cargarResultado`.
 *
 * Vive en `lib` y no en el servicio porque el formulario de carga
 * (`PanelResultados`, componente de cliente) lo usa como `max` del
 * input: importarlo desde el servicio arrastra `next/cache` al bundle
 * del navegador y el build falla.
 */
export const GOLES_MAXIMOS_POR_EQUIPO = 99;
