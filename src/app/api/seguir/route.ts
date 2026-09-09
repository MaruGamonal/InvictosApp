import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { seguir } from '@/services/notificaciones/seguir';
import { obtenerEstadoSeguimiento } from '@/services/notificaciones/obtenerEstadoSeguimiento';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';

/** UC-42/UC-43 — Seguir un torneo o un equipo. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return seguir(body, contexto);
  });
}

/** ¿Ya lo sigo? Sin sesión, `{ siguiendo: false }` — no es un error. */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const tipoSeguido = searchParams.get('tipoSeguido');
    const entidadId = searchParams.get('entidadId');
    if (!tipoSeguido || !entidadId) {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'tipoSeguido/entidadId', problema: 'Faltan parámetros.' },
      ]);
    }
    const contexto = await construirContexto();
    return obtenerEstadoSeguimiento(
      { tipoSeguido: tipoSeguido as 'tournament' | 'team', entidadId },
      contexto,
    );
  });
}
