import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { invitarMiembro } from '@/services/organizadores/invitarMiembro';

/** UC-07 — Sumar un Administrador al equipo de trabajo de la organización. Solo el Titular. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return invitarMiembro(body, contexto);
  });
}
