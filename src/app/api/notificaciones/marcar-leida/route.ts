import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { marcarLeida } from '@/services/notificaciones/marcarLeida';

/** UC-46 — Marcar una notificación propia como leída. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return marcarLeida(body, contexto);
  });
}
