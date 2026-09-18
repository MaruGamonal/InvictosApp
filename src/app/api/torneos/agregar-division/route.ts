import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { agregarDivision } from '@/services/torneos/agregarDivision';
import { construirContexto } from '@/lib/contexto';

/** UC-16 (paso 5) — Abrir otra categoría competitiva del mismo evento (`06`, D-103). */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return agregarDivision(body, contexto);
  });
}
