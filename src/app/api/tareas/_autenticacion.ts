import type { NextRequest } from 'next/server';
import { crearError } from '@/lib/errores';

/**
 * Las rutas de tareas programadas no llevan sesión de usuario — las
 * dispara `pg_cron` + `pg_net` desde Supabase (T28, `10` T-11), no una
 * persona — así que se protegen con un secreto compartido en vez de
 * `verificarPermiso*`. Sin esto, cualquiera en internet podría disparar
 * la confirmación masiva de resultados. `CRON_SECRET` es el nombre que
 * fija `pasos-infraestructura-T28.md`: es la variable que se carga en
 * Vercel y la que usa la tarea de Postgres al llamar por HTTP.
 */
export function verificarSecretoDeTarea(request: NextRequest): void {
  const secreto = process.env.CRON_SECRET;
  const encabezado = request.headers.get('authorization');
  if (!secreto || encabezado !== `Bearer ${secreto}`) {
    throw crearError('SIN_PERMISO');
  }
}
