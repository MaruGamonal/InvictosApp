/**
 * Nombre de la cookie del descubrimiento. Vive acá, y no dentro de
 * `/torneos`, porque `/equipos` comparte la de ciudad: las dos
 * pantallas son el mismo sistema de descubrimiento y elegir la ciudad
 * en una vale para la otra.
 *
 * Hubo una segunda, `categoria_genero_preferida`, detrás del selector
 * «Elegí qué torneos ver». Se fue: la categoría de género es ahora un
 * desplegable más, igual que en `/equipos`. Una preferencia guardada
 * sin un control a la vista es una lista filtrada que no se puede
 * desfiltrar.
 */
export const NOMBRE_COOKIE_CIUDAD = 'ciudad_id';
