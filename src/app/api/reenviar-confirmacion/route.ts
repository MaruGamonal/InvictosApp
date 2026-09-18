import { comoRespuestaHttp } from '@/lib/respuesta';
import { reenviarConfirmacion } from '@/services/identidad/reenviarConfirmacion';
import { construirContexto } from '@/lib/contexto';

/** Reenvía el enlace que confirma la cuenta (`verificarCuentaConfirmada`). */
export async function POST() {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    return reenviarConfirmacion(undefined, contexto);
  });
}
