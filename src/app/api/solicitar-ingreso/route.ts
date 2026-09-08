import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { solicitarIngreso } from '@/services/equipos/solicitarIngreso';
import { construirContexto } from '@/lib/contexto';

/** UC-53 — Pedir sumarme a un equipo. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return solicitarIngreso(body, contexto);
  });
}
