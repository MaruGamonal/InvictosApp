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

/**
 * Estados de partido que todavía pueden recibir un resultado.
 *
 * Un suspendido sí: se reprograma y se juega. Un ganado por
 * presentación o un anulado, no — ya están resueltos, y antes se
 * quedaban en la lista de pendientes con los campos de goles al lado de
 * un partido que nadie iba a jugar.
 *
 * Vive acá porque lo usan tres lugares que tienen que decir lo mismo: la
 * pestaña de Resultados, el cálculo de lo que espera al organizador
 * (`_pendientes.ts`) y el permiso del capitán para cargar
 * (`obtenerPartido`). Con una copia por archivo, la primera vez que
 * aparezca un estado nuevo van a dejar de coincidir y nadie se va a
 * enterar hasta que alguien reporte que le falta un partido.
 */
export const ESTADOS_QUE_ESPERAN_RESULTADO: ReadonlySet<string> = new Set([
  'unscheduled',
  'scheduled',
  'postponed',
]);
