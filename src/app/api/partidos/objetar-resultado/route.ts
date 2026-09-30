import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { disputarResultado } from '@/services/competencia/disputarResultado';
import { construirContexto } from '@/lib/contexto';

/** T29 — El equipo rival objeta un resultado cargado por el otro. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return disputarResultado(body, contexto);
  });
}
