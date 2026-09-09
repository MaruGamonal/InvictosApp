import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { definirFormato } from '@/services/torneos/definirFormato';
import { construirContexto } from '@/lib/contexto';

/** UC-17 — Definir formato del torneo (crea fases y grupos). */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return definirFormato(body, contexto);
  });
}
