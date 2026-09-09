import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { verificarSecretoDeTarea } from '../../tareas/_autenticacion';
import { sembrarDemo } from '../../../../../scripts/sembrar-demo';

/**
 * Dispara `scripts/sembrar-demo.ts` sin terminal — pensado para cuando
 * lo único a mano es el panel de Supabase, no una máquina con Node.
 * Reusa `CRON_SECRET` (ya cargado en Vercel para T26/T28) en vez de
 * pedir una variable de entorno nueva: no es una tarea programada, pero
 * el mismo criterio de "secreto compartido en el header Authorization"
 * aplica igual — sin sesión de por medio, protegido para que no
 * cualquiera en internet pueda sembrar datos de prueba en producción.
 *
 * Puede tardar — genera varios torneos con fixture y resultados. Se
 * puede correr más de una vez: cada corrida crea usuarios demo nuevos
 * (`randomUUID()` en el email), así que repetir esto duplica los datos
 * de demo en vez de pisarlos.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);
    await sembrarDemo();
    return { sembrado: true };
  });
}
