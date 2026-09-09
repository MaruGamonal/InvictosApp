import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { generarFixture } from '@/services/fixture/generarFixture';
import { construirContexto } from '@/lib/contexto';

/** UC-29 — Genera la propuesta de fixture de una fase, sin persistir. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return generarFixture(body, contexto);
  });
}
