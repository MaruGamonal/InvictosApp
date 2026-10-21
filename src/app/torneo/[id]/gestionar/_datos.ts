import { cache } from 'react';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import {
  obtenerGestionTorneo,
  type GestionTorneoResultado,
} from '@/services/torneos/obtenerGestionTorneo';

/**
 * Lecturas compartidas por el layout y las cinco pestañas de
 * `/torneo/[id]/gestionar` (Resumen/Equipos/Fixture/Resultados/
 * Configuración): todas necesitan el mismo `contexto` y la mayoría
 * necesita el mismo `obtenerGestionTorneo`. `cache()` de React
 * deduplica ambas llamadas dentro del mismo request — sin esto, el
 * layout (que arma el header) y cada página (que arma su contenido)
 * duplicarían la misma consulta a la base en cada visita. A diferencia
 * de `torneo/[id]/_datos.ts` (público, cacheado por evento), esto es
 * autenticado y nunca se comparte entre pedidos.
 */

export const obtenerContextoCacheado = cache(() => construirContexto());

export const obtenerGestionCacheada = cache(async (torneoId: string) => {
  const contexto = await obtenerContextoCacheado();
  return obtenerGestionTorneo({ torneoId }, contexto);
});

/**
 * Las pantallas que son sólo de la organización: Resumen, Equipos y
 * todo Configuración. Un Colaborador entra a la gestión —necesita
 * Resultados y la parte de programar de Fixture (`06`, D-32)— pero
 * publicar el torneo, resolver inscripciones o cambiar las reglas no
 * son suyas.
 *
 * **Esto no reemplaza al permiso del servicio, lo acompaña.** Cada uno
 * de los servicios de atrás sigue verificando por su cuenta
 * (`publicarTorneo` y `actualizarTorneo` piden `configurar_torneo`,
 * `resolverInscripcion` pide `resolver_inscripciones`): a la API se le
 * puede pegar directo sin pasar por ninguna pantalla. Lo que esto
 * evita es ofrecerle a alguien una pantalla que al tocar un botón le
 * va a decir que no.
 */
export async function exigirQueOrganice(torneoId: string): Promise<GestionTorneoResultado> {
  const gestion = await obtenerGestionCacheada(torneoId);
  if (gestion.miRolEnTorneo !== 'organizacion') {
    redirect(`/torneo/${torneoId}/gestionar/resultados`);
  }
  return gestion;
}
