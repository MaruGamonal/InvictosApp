import { cache } from 'react';
import { construirContexto } from '@/lib/contexto';
import { resolverOrganizacionActiva } from '@/services/organizadores/resolverOrganizacionActiva';
import { obtenerPanelOrganizador } from '@/services/organizadores/obtenerPanelOrganizador';

/**
 * Lecturas compartidas por el layout y las páginas de
 * `/organizador/gestionar` — mismo criterio que
 * `torneo/[id]/gestionar/_datos.ts`: `cache()` de React deduplica
 * dentro del mismo request, autenticado, nunca compartido entre pedidos.
 */

export const obtenerContextoCacheado = cache(() => construirContexto());

export const obtenerOrganizacionActivaCacheada = cache(async () => {
  const contexto = await obtenerContextoCacheado();
  return resolverOrganizacionActiva(undefined, contexto);
});

export const obtenerPanelCacheado = cache(async (organizacionId: string) => {
  const contexto = await obtenerContextoCacheado();
  return obtenerPanelOrganizador({ organizacionId }, contexto);
});
