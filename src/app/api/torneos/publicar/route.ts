import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { publicarTorneo } from '@/services/torneos/publicarTorneo';
import { construirContexto } from '@/lib/contexto';

/** UC-18 — Publicar el torneo: draft → registration_open. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return publicarTorneo(body, contexto);
  });
}
