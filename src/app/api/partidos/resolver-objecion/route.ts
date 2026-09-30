import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { resolverDisputa } from '@/services/competencia/resolverDisputa';
import { construirContexto } from '@/lib/contexto';

/** T29 — El organizador rechaza una objeción: el resultado queda firme. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return resolverDisputa(body, contexto);
  });
}
