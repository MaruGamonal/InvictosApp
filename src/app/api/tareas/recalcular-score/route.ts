import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { recalcularScore } from '@/services/plataforma/recalcularScore';
import { verificarSecretoDeTarea } from '../_autenticacion';

/** T26, `10` 6.3 — declarada y agendada (diaria), todavía sin fórmula: ver recalcularScore.ts. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);
    return recalcularScore();
  });
}
