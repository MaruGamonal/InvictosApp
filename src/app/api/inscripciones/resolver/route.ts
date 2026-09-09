import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { resolverInscripcion } from '@/services/inscripciones/resolverInscripcion';
import { construirContexto } from '@/lib/contexto';

/** UC-25 — Aprobar o rechazar una inscripción. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return resolverInscripcion(body, contexto);
  });
}
