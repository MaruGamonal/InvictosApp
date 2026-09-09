import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { asegurarOrganizacionPropia } from '@/services/organizadores/asegurarOrganizacionPropia';
import { construirContexto } from '@/lib/contexto';

/**
 * UC-16 — Crear torneo. El Flujo 3 del paquete de diseño arranca directo
 * acá, sin pasar por "Crear organización" (`asegurarOrganizacionPropia`
 * la resuelve sola). Pide sesión real.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    const { organizacionId } = await asegurarOrganizacionPropia(undefined, contexto);
    return crearTorneo({ ...body, organizacionId }, contexto);
  });
}
