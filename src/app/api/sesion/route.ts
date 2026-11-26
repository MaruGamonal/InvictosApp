import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';

/**
 * ¿Quien mira tiene sesión? Para dibujar el nav, la campanita y el
 * enlace de ingreso en las pantallas públicas (`sesionDelCliente.ts`).
 *
 * Contesta 200 siempre: no tener sesión es una respuesta, no un error.
 * Antes se preguntaba a `/api/mi-usuario`, que rechaza al visitante con
 * 401, y cada página pública dejaba un error en la consola del
 * navegador —ruido que tapa los errores de verdad—. `/api/mi-usuario`
 * sigue como está: es la demostración de NO_AUTENTICADO (T3).
 *
 * No autoriza nada: cada servicio resuelve la sesión por su cuenta.
 */
export async function GET() {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    return { autenticado: Boolean(contexto.usuarioId) };
  });
}
