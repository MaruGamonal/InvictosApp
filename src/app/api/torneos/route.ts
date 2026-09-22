import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { asegurarOrganizacionPropia } from '@/services/organizadores/asegurarOrganizacionPropia';
import { construirContexto } from '@/lib/contexto';

/**
 * UC-16 — Crear torneo. `asegurarOrganizacionPropia` resuelve bajo qué
 * organización nace, y falla con `SIN_ORGANIZACION` si la persona no
 * tiene ninguna: la organización ya no se crea sola. Pide sesión real.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    const { organizacionId } = await asegurarOrganizacionPropia(undefined, contexto);
    return crearTorneo({ ...body, organizacionId }, contexto);
  });
}
