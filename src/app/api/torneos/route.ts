import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { asegurarOrganizacionPropia } from '@/services/organizadores/asegurarOrganizacionPropia';
import { construirContexto } from '@/lib/contexto';
import { NOMBRE_COOKIE_ORGANIZACION_ACTIVA } from '@/lib/cookies';

/**
 * UC-16 — Crear torneo. `asegurarOrganizacionPropia` resuelve bajo qué
 * organización nace —la que se está gestionando en el panel— y falla
 * con `SIN_ORGANIZACION` si la persona no tiene ninguna: la
 * organización ya no se crea sola. Pide sesión real.
 *
 * La cookie no otorga nada: el servicio la valida contra los vínculos
 * reales de quien pide.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const [contexto, cookieStore] = await Promise.all([construirContexto(), cookies()]);
    const { organizacionId } = await asegurarOrganizacionPropia(
      { organizacionIdPreferida: cookieStore.get(NOMBRE_COOKIE_ORGANIZACION_ACTIVA)?.value },
      contexto,
    );
    return crearTorneo({ ...body, organizacionId }, contexto);
  });
}
