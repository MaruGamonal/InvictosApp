import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { quitarColaborador } from '@/services/organizadores/quitarColaborador';

/** UC-52 — Sacar a un colaborador de este torneo (baja lógica). Titular/Administrador. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return quitarColaborador(body, contexto);
  });
}
