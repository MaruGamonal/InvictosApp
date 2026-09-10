import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { invitarColaborador } from '@/services/organizadores/invitarColaborador';

/** UC-52 — Sumar un colaborador a este torneo, por email. Titular/Administrador. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return invitarColaborador(body, contexto);
  });
}
