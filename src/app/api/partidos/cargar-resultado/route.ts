import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { construirContexto } from '@/lib/contexto';

/** UC-31 — Cargar el resultado de un partido a mano. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return cargarResultado(body, contexto);
  });
}
