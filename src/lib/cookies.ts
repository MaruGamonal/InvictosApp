/**
 * Los nombres de las cookies de la aplicación, en un solo lugar.
 *
 * Están acá y no al lado de la pantalla que las escribe porque
 * ninguna pertenece a una sola: `/equipos` y `/torneos` comparten la
 * ciudad, y la organización activa se escribe en el panel pero se lee
 * también desde la API que crea torneos.
 *
 * Que sean constantes sueltas —y no vivan dentro del archivo de
 * Server Actions que las usa— no es un detalle de gusto: un módulo
 * `'use server'` solo puede exportar funciones asíncronas, así que
 * exportar un `const` desde ahí rompe el build.
 */

/**
 * Ciudad del descubrimiento (D-90: la ciudad es contexto, nunca se
 * infiere). Vale para `/equipos` y para `/torneos`: elegirla en una
 * vale para la otra.
 *
 * Hubo una segunda, `categoria_genero_preferida`, detrás del selector
 * «Elegí qué torneos ver». Se fue: la categoría de género es ahora un
 * desplegable más, igual que en `/equipos`. Una preferencia guardada
 * sin un control a la vista es una lista filtrada que no se puede
 * desfiltrar.
 */
export const NOMBRE_COOKIE_CIUDAD = 'ciudad_id';

/**
 * Cuál de sus organizaciones está gestionando la persona ahora.
 *
 * Vive en una cookie y no en la base por lo mismo que la ciudad: es
 * contexto de navegación, no un dato de la cuenta.
 *
 * **La cookie no otorga nada.** `resolverOrganizacionActiva` la valida
 * contra los vínculos reales de quien mira, así que escribir ahí el id
 * de una organización ajena no da acceso a nada — se ignora y se cae a
 * la primera propia.
 */
export const NOMBRE_COOKIE_ORGANIZACION_ACTIVA = 'organizacion_activa';
