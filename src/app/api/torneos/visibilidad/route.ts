import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { cambiarVisibilidadTorneo } from '@/services/torneos/cambiarVisibilidadTorneo';
import { construirContexto } from '@/lib/contexto';

/** Sacar un torneo de las búsquedas, o volver a ponerlo (`06`, D-21b). */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return cambiarVisibilidadTorneo(body, contexto);
  });
}
