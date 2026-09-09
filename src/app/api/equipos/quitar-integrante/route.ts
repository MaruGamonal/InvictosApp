import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { quitarIntegrante } from '@/services/equipos/quitarIntegrante';

/**
 * UC-13 — Quitar a alguien del plantel, o dejar el equipo uno mismo
 * (mismo servicio: `quitarIntegrante` distingue baja propia de ajena
 * por si `perfilId` coincide con el perfil de quien llama).
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return quitarIntegrante(body, contexto);
  });
}
