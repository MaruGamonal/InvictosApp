import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { restablecerPassword } from '@/services/identidad/restablecerPassword';
import { construirContexto } from '@/lib/contexto';

/**
 * Último paso de "¿Olvidaste tu contraseña?". A diferencia de
 * `/api/registro` e `/api/ingresar`, esta ruta sí necesita la sesión
 * real de la petición (`construirContexto`, no `contextoDeSistema`):
 * es la sesión de recuperación que dejó puesta `auth/callback` al
 * canjear el enlace del correo.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return restablecerPassword(body, contexto);
  });
}
