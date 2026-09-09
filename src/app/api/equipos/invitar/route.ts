import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { invitarIntegrante } from '@/services/equipos/invitarIntegrante';

/** UC-11 — Invitar al plantel, por nombre (crea perfil sin reclamar si no existe). Capitán o Delegado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return invitarIntegrante(body, contexto);
  });
}
