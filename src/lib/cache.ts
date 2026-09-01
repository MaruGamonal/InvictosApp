import { revalidateTag, unstable_cache } from 'next/cache';

/**
 * Caché de las superficies públicas (`10`, 2.8): renderizadas en servidor,
 * **invalidadas por evento, nunca por tiempo**. Cargar un resultado —o
 * cualquier otro cambio sobre un torneo o un equipo— invalida la ficha,
 * el fixture y la tabla de ese torneo, y los perfiles de los equipos
 * involucrados. Sin esto, la tabla no sería la recompensa inmediata del
 * trabajo de carga que `08`, 11.5 pide que sea — sería una promesa vacía
 * hasta que venciera un caché por tiempo que acá no existe.
 *
 * Una etiqueta por torneo (`torneo:<id>`) cubre sus cuatro rutas
 * públicas a la vez, porque todas dependen del mismo estado subyacente;
 * una etiqueta por equipo (`equipo:<id>`) es la que va a usar T23 para
 * su perfil público, ya lista desde acá.
 */

export function etiquetaTorneo(torneoId: string): string {
  return `torneo:${torneoId}`;
}

export function etiquetaEquipo(equipoId: string): string {
  return `equipo:${equipoId}`;
}

/**
 * `revalidateTag` exige una petición real de Next (ruta, Server Action,
 * renderizado) — fuera de eso lanza `Invariant: static generation store
 * missing`: en las pruebas, y en una tarea programada que no pase por
 * una ruta. Los servicios de escritura (T15, T16, T17, ...) son hoy el
 * único lugar donde puede vivir esta invalidación —no existe todavía
 * una capa de rutas para las acciones del organizador—, así que tienen
 * que poder llamarla sin que ese contexto le rompa la escritura
 * principal. Mismo criterio que `notificar()` en T15/T16: un efecto
 * secundario que falla nunca revierte el hecho de negocio.
 */
function revalidarSinRomperElLlamador(etiqueta: string): void {
  try {
    revalidateTag(etiqueta);
  } catch {
    // Sin contexto de petición de Next: no hay entrada de caché que
    // invalidar. No es un error de quien llamó a este servicio.
  }
}

/** Invalida todo lo cacheado de un torneo (ficha, fixture, tabla, reglamento). */
export function invalidarCacheTorneo(torneoId: string): void {
  revalidarSinRomperElLlamador(etiquetaTorneo(torneoId));
}

/** Invalida el perfil público cacheado de un equipo (T23). */
export function invalidarCacheEquipo(equipoId: string): void {
  revalidarSinRomperElLlamador(etiquetaEquipo(equipoId));
}

/**
 * Envuelve una lectura pública en la caché de datos de Next, con la
 * etiqueta del torneo. Se llama una vez por request desde cada página —
 * `unstable_cache` deduplica por `keyParts` más los argumentos de la
 * función devuelta, así que envolver de nuevo en cada request no repite
 * el trabajo mientras la entrada siga vigente.
 */
export function cachearLecturaDeTorneo<T>(
  nombre: string,
  torneoId: string,
  fn: () => Promise<T>,
): () => Promise<T> {
  return unstable_cache(fn, [nombre, torneoId], { tags: [etiquetaTorneo(torneoId)] });
}
