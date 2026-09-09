import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { cancelarInvitacion } from '@/services/equipos/cancelarInvitacion';

/** UC-11 — Cancelar una invitación pendiente. Capitán o Delegado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return cancelarInvitacion(body, contexto);
  });
}
