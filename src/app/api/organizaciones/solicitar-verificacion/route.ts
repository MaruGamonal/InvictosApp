import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { solicitarVerificacionBasica } from '@/services/organizadores/solicitarVerificacionBasica';

/**
 * UC-06 — Pedir la verificación básica de la organización: mandamos un
 * enlace a la dirección de acceso del Titular (`06`, D-76).
 *
 * El servicio existía desde T7 pero no había ruta ni pantalla que lo
 * llamara, así que verificar una organización era imposible desde la
 * aplicación — y sin verificar, D-51 deja los torneos no listados. Era
 * la mitad que faltaba de la regla.
 *
 * Exclusivo del Titular: lo decide `verificarPermisoOrganizacion`
 * dentro del servicio, no esta ruta ni la pantalla.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return solicitarVerificacionBasica(body, contexto);
  });
}
