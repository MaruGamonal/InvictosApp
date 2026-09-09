import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { construirContexto } from '@/lib/contexto';

/** UC-10 — Crear equipo. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return crearEquipo(body, contexto);
  });
}
