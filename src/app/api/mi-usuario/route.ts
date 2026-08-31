import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';

/**
 * Ruta de demostración de T3: prueba que un servicio que requiere sesión
 * la rechaza con NO_AUTENTICADO cuando no la hay, y que el `usuario_id`
 * siempre sale de la sesión resuelta en el servidor — nunca de algo que
 * mande el cliente.
 */
export async function GET() {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    if (!contexto.usuarioId) {
      throw crearError('NO_AUTENTICADO');
    }
    return { usuarioId: contexto.usuarioId };
  });
}
