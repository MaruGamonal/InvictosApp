import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { cambiarRolIntegrante } from '@/services/equipos/cambiarRolIntegrante';

/** UC-13 — Asignar o quitar un rol interno del plantel (o transferir la capitanía). Exclusivo del Capitán. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return cambiarRolIntegrante(body, contexto);
  });
}
