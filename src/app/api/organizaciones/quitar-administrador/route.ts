import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { quitarMiembro } from '@/services/organizadores/quitarMiembro';

/** UC-07 — Quitar a un Administrador del equipo de trabajo de la organización. Solo el Titular. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return quitarMiembro(body, contexto);
  });
}
