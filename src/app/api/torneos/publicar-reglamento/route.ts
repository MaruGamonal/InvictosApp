import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { publicarReglamento } from '@/services/torneos/publicarReglamento';
import { construirContexto } from '@/lib/contexto';

/** UC-51 — Publicar una versión nueva del reglamento del torneo. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return publicarReglamento(body, contexto);
  });
}
