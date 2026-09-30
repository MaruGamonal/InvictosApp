import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { registrarNoDisputado } from '@/services/competencia/registrarNoDisputado';
import { construirContexto } from '@/lib/contexto';

/** UC-33 — Registrar qué pasó con un partido que no se jugó. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return registrarNoDisputado(body, contexto);
  });
}
