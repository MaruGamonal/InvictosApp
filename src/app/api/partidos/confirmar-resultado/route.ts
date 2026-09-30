import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { confirmarResultado } from '@/services/competencia/confirmarResultado';
import { construirContexto } from '@/lib/contexto';

/** UC-32 — El equipo rival confirma un resultado cargado por el otro. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return confirmarResultado(body, contexto);
  });
}
