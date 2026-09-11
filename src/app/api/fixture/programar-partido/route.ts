import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { programarPartido } from '@/services/fixture/programarPartido';
import { construirContexto } from '@/lib/contexto';

/** UC-30 — Programar o reprogramar un partido (fecha, hora y sede). */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return programarPartido(body, contexto);
  });
}
