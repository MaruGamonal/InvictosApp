import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { actualizarModoInicio } from '@/services/inicio/actualizarModoInicio';

/** Preferencia de modo (Jugador/Organizador) en Inicio. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return actualizarModoInicio(body, contexto);
  });
}
