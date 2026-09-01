import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { confirmarResultadosVencidos } from '@/services/plataforma/confirmarResultadosVencidos';
import { verificarSecretoDeTarea } from '../_autenticacion';

/** T26, `10` 6.1 — punto de entrada para el scheduler externo que agende T28. Cada hora. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);
    return confirmarResultadosVencidos();
  });
}
