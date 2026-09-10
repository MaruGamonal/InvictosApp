import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';

/** UC-52 — Colaboradores de este torneo. Titular/Administrador. */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const torneoId = searchParams.get('torneoId');
    if (!torneoId) {
      throw crearError('DATOS_INVALIDOS', [{ campo: 'torneoId', problema: 'Falta el parámetro.' }]);
    }
    const contexto = await construirContexto();
    return listarColaboradoresTorneo({ torneoId }, contexto);
  });
}
