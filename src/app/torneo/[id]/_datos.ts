import { notFound } from 'next/navigation';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { cachearLecturaDeTorneo } from '@/lib/cache';
import { esErrorDeAplicacion } from '@/lib/errores';
import { obtenerFichaTorneo, type FichaTorneo } from '@/services/descubrimiento/obtenerFichaTorneo';
import {
  obtenerFixturePublico,
  type FixturePublico,
} from '@/services/descubrimiento/obtenerFixturePublico';
import { obtenerTablaTorneo } from '@/services/descubrimiento/obtenerTablaTorneo';
import type { TablaDeGrupo } from '@/services/posiciones/obtenerTabla';
import { listarReglamentos, type ReglamentoListado } from '@/services/torneos/listarReglamentos';

/**
 * Lecturas compartidas por las cuatro páginas públicas de `/torneo/[id]`
 * (T21): siempre con `CONTEXTO_PUBLICO` — nunca la sesión real de quien
 * mira — y siempre cacheadas por torneo (`@/lib/cache`), invalidadas por
 * evento desde los servicios de escritura. Un torneo `draft` nunca llega
 * a poblar esta caché: `verificarPuedeVerTorneo`, dentro de cada
 * servicio, lo rechaza para cualquiera que no sea quien lo administra —
 * y acá siempre se pregunta como si nadie lo fuera.
 */

async function comoNoEncontradoEsNull<T>(promesa: Promise<T>): Promise<T | null> {
  try {
    return await promesa;
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') return null;
    throw error;
  }
}

export async function obtenerFichaCacheada(torneoId: string): Promise<FichaTorneo | null> {
  return comoNoEncontradoEsNull(
    cachearLecturaDeTorneo('ficha-torneo', torneoId, () =>
      obtenerFichaTorneo({ torneoId }, CONTEXTO_PUBLICO),
    )(),
  );
}

/** Para usar desde cada página: si el torneo no existe o no es visible, corta con 404. */
export async function obtenerFichaOFallar(torneoId: string): Promise<FichaTorneo> {
  const ficha = await obtenerFichaCacheada(torneoId);
  if (!ficha) notFound();
  return ficha;
}

export async function obtenerFixtureCacheado(torneoId: string): Promise<FixturePublico | null> {
  return comoNoEncontradoEsNull(
    cachearLecturaDeTorneo('fixture-torneo', torneoId, () =>
      obtenerFixturePublico({ torneoId }, CONTEXTO_PUBLICO),
    )(),
  );
}

export async function obtenerTablaCacheada(torneoId: string): Promise<TablaDeGrupo[] | null> {
  return comoNoEncontradoEsNull(
    cachearLecturaDeTorneo('tabla-torneo', torneoId, () =>
      obtenerTablaTorneo({ torneoId }, CONTEXTO_PUBLICO),
    )(),
  );
}

export async function obtenerReglamentosCacheados(
  torneoId: string,
): Promise<ReglamentoListado[] | null> {
  return comoNoEncontradoEsNull(
    cachearLecturaDeTorneo('reglamentos-torneo', torneoId, () =>
      listarReglamentos({ torneoId }, CONTEXTO_PUBLICO),
    )(),
  );
}
