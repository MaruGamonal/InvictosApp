import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { iniciarSesion } from '@/services/identidad/iniciarSesion';
import { contextoDeSistema } from '@/lib/contexto';

/** UC-01 (ingreso) — correo + contraseña. Ruta pública. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    return iniciarSesion(body, contextoDeSistema());
  });
}
