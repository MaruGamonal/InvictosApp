import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { actualizarEquipo } from '@/services/equipos/actualizarEquipo';

/** UC-10 — Editar los datos del equipo. Capitán o Delegado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return actualizarEquipo(body, contexto);
  });
}
