import { comoRespuestaHttp } from '@/lib/respuesta';
import { listarMisEquiposGestionables } from '@/services/equipos/listarMisEquiposGestionables';
import { construirContexto } from '@/lib/contexto';

/** Equipos donde soy Capitana o Delegada — para elegir a cuál inscribir en un torneo. */
export async function GET() {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    return listarMisEquiposGestionables(undefined, contexto);
  });
}
