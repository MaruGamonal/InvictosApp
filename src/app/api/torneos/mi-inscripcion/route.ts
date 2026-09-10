import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { obtenerMiInscripcionEnTorneo } from '@/services/inscripciones/obtenerMiInscripcionEnTorneo';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';

/** ¿Ya inscribí a alguno de mis equipos en este torneo? Sin sesión o sin vínculo, `[]` — no es un error. */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const torneoId = searchParams.get('torneoId');
    if (!torneoId) {
      throw crearError('DATOS_INVALIDOS', [{ campo: 'torneoId', problema: 'Falta el parámetro.' }]);
    }
    const contexto = await construirContexto();
    return obtenerMiInscripcionEnTorneo({ torneoId }, contexto);
  });
}
