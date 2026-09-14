import { cache } from 'react';
import { construirContexto } from '@/lib/contexto';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';

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
