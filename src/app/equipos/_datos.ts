import { unstable_cache } from 'next/cache';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { buscarEquipos, type BuscarEquiposInput } from '@/services/equipos/buscarEquipos';

/** Caché corta (`10`, 2.8), mismo criterio que `/torneos/_datos.ts`: cambia poco a poco, no al segundo. */
const REVALIDACION_CORTA_SEGUNDOS = 30;

export async function buscarEquiposCacheado(input: BuscarEquiposInput) {
  return unstable_cache(
    () => buscarEquipos(input, CONTEXTO_PUBLICO),
    ['buscar-equipos', JSON.stringify(input)],
    { revalidate: REVALIDACION_CORTA_SEGUNDOS },
  )();
}
