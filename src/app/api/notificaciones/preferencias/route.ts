import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { obtenerPreferenciasNotificacion } from '@/services/notificaciones/obtenerPreferenciasNotificacion';
import { actualizarPreferenciaNotificacion } from '@/services/notificaciones/actualizarPreferenciaNotificacion';

/** UC-47 — Preferencias de notificación. Pide sesión real. */
export async function GET() {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    return obtenerPreferenciasNotificacion(undefined, contexto);
  });
}

export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return actualizarPreferenciaNotificacion(body, contexto);
  });
}
