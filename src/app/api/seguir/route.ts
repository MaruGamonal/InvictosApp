import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { seguir } from '@/services/notificaciones/seguir';
import { construirContexto } from '@/lib/contexto';

/** UC-42/UC-43 — Seguir un torneo o un equipo. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return seguir(body, contexto);
  });
}
