import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { listarNotificaciones } from '@/services/notificaciones/listarNotificaciones';

/** UC-46 — Centro de notificaciones (solo el subconjunto accionable). */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const contexto = await construirContexto();
    return listarNotificaciones({ cursor }, contexto);
  });
}
