import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { inscribirEquipoManual } from '@/services/inscripciones/inscribirEquipoManual';
import { construirContexto } from '@/lib/contexto';

/** UC-26 — El organizador carga un equipo a mano, existente o nuevo. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return inscribirEquipoManual(body, contexto);
  });
}
