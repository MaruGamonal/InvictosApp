import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { construirContexto } from '@/lib/contexto';

/** UC-24 — Inscribir mi equipo a un torneo. Pide sesión real y rol de Capitán/Delegado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return solicitarInscripcion(body, contexto);
  });
}
