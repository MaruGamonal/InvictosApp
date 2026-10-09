import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { ajustarPuntos } from '@/services/posiciones/ajustarPuntos';
import { construirContexto } from '@/lib/contexto';

/** UC-35 — Quita o bonificación de puntos aplicada por el organizador (`06`, D-35b). */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return ajustarPuntos(body, contexto);
  });
}
