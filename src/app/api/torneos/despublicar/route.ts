import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { despublicarTorneo } from '@/services/torneos/despublicarTorneo';
import { construirContexto } from '@/lib/contexto';

/** Volver un torneo publicado a borrador, si todavía no se anotó nadie. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return despublicarTorneo(body, contexto);
  });
}
