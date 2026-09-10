import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { cancelarTorneo } from '@/services/torneos/cancelarTorneo';

/** UC-21 — Cancelar un torneo, de forma definitiva. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return cancelarTorneo(body, contexto);
  });
}
