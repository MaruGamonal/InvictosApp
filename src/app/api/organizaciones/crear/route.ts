import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearOrganizacion } from '@/services/organizadores/crearOrganizacion';

/** UC-06 — Crear una organización propia desde el panel de Organizador. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return crearOrganizacion(body, contexto);
  });
}
