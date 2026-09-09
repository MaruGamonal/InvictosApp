import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { responderInvitacion } from '@/services/equipos/responderInvitacion';

/** UC-12 — Aceptar o rechazar una invitación al plantel propia. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return responderInvitacion(body, contexto);
  });
}
