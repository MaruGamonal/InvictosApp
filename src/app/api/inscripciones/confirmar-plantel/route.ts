import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { confirmarPlantel } from '@/services/inscripciones/confirmarPlantel';
import { construirContexto } from '@/lib/contexto';

/** UC-27 — Confirmar la lista de buena fe del equipo para este torneo. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return confirmarPlantel(body, contexto);
  });
}
