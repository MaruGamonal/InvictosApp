import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { resolverSolicitudIngreso } from '@/services/equipos/resolverSolicitudIngreso';

/** UC-53 — Aprobar o rechazar una solicitud de ingreso al plantel. Capitán o Delegado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return resolverSolicitudIngreso(body, contexto);
  });
}
