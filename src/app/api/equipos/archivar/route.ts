import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { archivarEquipo } from '@/services/equipos/archivarEquipo';

/** UC-15 — Archivar el equipo (baja lógica). Exclusivo del Capitán. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return archivarEquipo(body, contexto);
  });
}
