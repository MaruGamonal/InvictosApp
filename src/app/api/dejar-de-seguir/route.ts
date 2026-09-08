import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { dejarDeSeguir } from '@/services/notificaciones/dejarDeSeguir';
import { construirContexto } from '@/lib/contexto';

/** UC-42/UC-43 — Dejar de seguir un torneo o un equipo. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return dejarDeSeguir(body, contexto);
  });
}
