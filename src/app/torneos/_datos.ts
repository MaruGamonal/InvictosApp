import { unstable_cache } from 'next/cache';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { buscarTorneos, type BuscarTorneosInput } from '@/services/descubrimiento/buscarTorneos';
import { listarCiudades } from '@/services/descubrimiento/listarCiudades';

/**
 * UC-22 — El descubrimiento lleva **caché corta** (`10`, 2.8), no
 * invalidada por evento como la ficha (T21): es una lista que cambia
 * poco a poco (nuevos torneos publicados), no algo que alguien necesite
 * ver actualizado al segundo después de su propia acción. Por eso acá
 * alcanza con `unstable_cache` con un `revalidate` corto en vez de la
 * etiqueta por torneo de `@/lib/cache.ts`.
 */

const REVALIDACION_CORTA_SEGUNDOS = 30;

export async function buscarTorneosCacheado(input: BuscarTorneosInput) {
  return unstable_cache(
    () => buscarTorneos(input, CONTEXTO_PUBLICO),
    ['buscar-torneos', JSON.stringify(input)],
    { revalidate: REVALIDACION_CORTA_SEGUNDOS },
  )();
}

export async function listarCiudadesCacheado(busqueda?: string) {
  return unstable_cache(
    () => listarCiudades({ busqueda }, CONTEXTO_PUBLICO),
    ['listar-ciudades', busqueda ?? ''],
    { revalidate: REVALIDACION_CORTA_SEGUNDOS },
  )();
}
