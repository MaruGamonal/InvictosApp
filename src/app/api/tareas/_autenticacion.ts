import type { NextRequest } from 'next/server';
import { crearError } from '@/lib/errores';

/**
 * Las rutas de tareas programadas no llevan sesión de usuario — las
 * dispara un scheduler externo (T28 decide cuál: Vercel Cron, GitHub
 * Actions, lo que sea), no una persona — así que se protegen con un
 * secreto compartido en vez de `verificarPermiso*`. Sin esto, cualquiera
 * en internet podría disparar la confirmación masiva de resultados.
 */
export function verificarSecretoDeTarea(request: NextRequest): void {
  const secreto = process.env.TAREAS_PROGRAMADAS_SECRET;
  const encabezado = request.headers.get('authorization');
  if (!secreto || encabezado !== `Bearer ${secreto}`) {
    throw crearError('SIN_PERMISO');
  }
}
