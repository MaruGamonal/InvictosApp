import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { retirarSolicitudIngreso } from '@/services/equipos/retirarSolicitudIngreso';

/** UC-53 — Retirar una solicitud de ingreso propia, mientras esté pendiente. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return retirarSolicitudIngreso(body, contexto);
  });
}
