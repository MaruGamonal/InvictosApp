import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { iniciarRegistro } from '@/services/identidad/registrar';
import { contextoDeSistema } from '@/lib/contexto';

/** UC-01, primera mitad: pide el enlace de acceso. Es una ruta pública. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    return iniciarRegistro(body, contextoDeSistema());
  });
}
