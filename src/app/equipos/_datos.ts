import { unstable_cache } from 'next/cache';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { buscarEquipos, type BuscarEquiposInput } from '@/services/equipos/buscarEquipos';

/** Caché corta (`10`, 2.8), mismo criterio que `/torneos/_datos.ts`: cambia poco a poco, no al segundo. */
const REVALIDACION_CORTA_SEGUNDOS = 30;

export async function buscarEquiposCacheado(input: BuscarEquiposInput) {
  return unstable_cache(
    () => buscarEquipos(input, CONTEXTO_PUBLICO),
    // Con versión desde el arranque: la clave de `/torneos/_datos.ts`
    // no la tenía y una entrada cacheada con la forma vieja de
    // `TorneoBuscado` tiró abajo esa página en producción cuando
    // `buscarTorneos` sumó campos (reportado en vivo vía Sentry). Si el
    // shape de `BuscarEquiposResultado` cambia, bumpear a 'v2'.
    ['buscar-equipos-v1', JSON.stringify(input)],
    { revalidate: REVALIDACION_CORTA_SEGUNDOS },
  )();
}
