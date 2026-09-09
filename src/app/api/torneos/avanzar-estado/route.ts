import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { avanzarEstado } from '@/services/torneos/avanzarEstado';
import { construirContexto } from '@/lib/contexto';

/** UC-20 — Avanzar el estado de un torneo ya publicado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return avanzarEstado(body, contexto);
  });
}
