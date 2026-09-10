import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { actualizarTorneo } from '@/services/torneos/actualizarTorneo';

/** UC-19 — Modificar la configuración de un torneo. Titular/Administrador. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return actualizarTorneo(body, contexto);
  });
}
