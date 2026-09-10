import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { darDeBajaDelTorneo } from '@/services/inscripciones/darDeBajaDelTorneo';
import { construirContexto } from '@/lib/contexto';

/** UC-28 — Dar de baja (o excluir) a un equipo de un torneo. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return darDeBajaDelTorneo(body, contexto);
  });
}
