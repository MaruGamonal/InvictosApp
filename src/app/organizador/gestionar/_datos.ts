import { cache } from 'react';
import { cookies } from 'next/headers';
import { construirContexto } from '@/lib/contexto';
import { resolverOrganizacionActiva } from '@/services/organizadores/resolverOrganizacionActiva';
import { obtenerPanelOrganizador } from '@/services/organizadores/obtenerPanelOrganizador';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { listarMisOrganizaciones } from '@/services/organizadores/listarMisOrganizaciones';
import { NOMBRE_COOKIE_ORGANIZACION_ACTIVA } from '@/lib/cookies';

/**
 * Lecturas compartidas por el layout y las páginas de
 * `/organizador/gestionar` — mismo criterio que
 * `torneo/[id]/gestionar/_datos.ts`: `cache()` de React deduplica
 * dentro del mismo request, autenticado, nunca compartido entre pedidos.
 */

export const obtenerContextoCacheado = cache(() => construirContexto());

export const obtenerOrganizacionActivaCacheada = cache(async () => {
  const [contexto, cookieStore] = await Promise.all([obtenerContextoCacheado(), cookies()]);
  return resolverOrganizacionActiva(
    { organizacionIdPreferida: cookieStore.get(NOMBRE_COOKIE_ORGANIZACION_ACTIVA)?.value },
    contexto,
  );
});

export const obtenerMisOrganizacionesCacheadas = cache(async () => {
  const contexto = await obtenerContextoCacheado();
  return listarMisOrganizaciones(undefined, contexto);
});

export const obtenerPanelCacheado = cache(async (organizacionId: string) => {
  const contexto = await obtenerContextoCacheado();
  return obtenerPanelOrganizador({ organizacionId }, contexto);
});

/**
 * Para el saludo de la cabecera. Quien organiza tiene perfil deportivo
 * igual que cualquiera —la cuenta es una sola—, así que sale de ahí; si
 * todavía no lo tiene armado, la cabecera saluda sin nombre en vez de
 * romperse.
 */
export const obtenerNombreDeQuienMiraCacheado = cache(async (): Promise<string> => {
  const contexto = await obtenerContextoCacheado();
  try {
    const perfil = await obtenerMiPerfil(undefined, contexto);
    return perfil.nombreVisible;
  } catch {
    return 'organizador/a';
  }
});
