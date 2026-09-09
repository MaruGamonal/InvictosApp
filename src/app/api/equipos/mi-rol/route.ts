import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { obtenerMiRolEnEquipo } from '@/services/equipos/obtenerMiRolEnEquipo';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';

/** ¿Qué rol tengo en este equipo? Sin sesión o sin vínculo, `{ roles: [] }` — no es un error. */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const equipoId = searchParams.get('equipoId');
    if (!equipoId) {
      throw crearError('DATOS_INVALIDOS', [{ campo: 'equipoId', problema: 'Falta el parámetro.' }]);
    }
    const contexto = await construirContexto();
    return obtenerMiRolEnEquipo({ equipoId }, contexto);
  });
}
