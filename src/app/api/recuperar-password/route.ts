import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { solicitarRecuperacionPassword } from '@/services/identidad/solicitarRecuperacionPassword';
import { contextoDeSistema } from '@/lib/contexto';

/** "¿Olvidaste tu contraseña?" — ruta pública. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    return solicitarRecuperacionPassword(body, contextoDeSistema());
  });
}
