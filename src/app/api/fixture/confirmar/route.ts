import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { confirmarFixture } from '@/services/fixture/confirmarFixture';
import { construirContexto } from '@/lib/contexto';

/** UC-29 — Confirma la propuesta de fixture y crea los partidos. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return confirmarFixture(body, contexto);
  });
}
