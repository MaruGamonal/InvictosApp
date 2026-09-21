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
 *
 * Distingue las dos fallas a propósito. Antes las dos devolvían
 * `SIN_PERMISO`, y desde afuera eran indistinguibles: un 403 podía
 * significar "el valor que mandaste no coincide" o "acá no hay ningún
 * secreto cargado", que se arreglan en lugares distintos. Perseguir la
 * primera cuando el problema era la segunda cuesta horas, y el síntoma
 * —la tarea horaria devolviendo 403 en cada corrida— no dice cuál es.
 */
export function verificarSecretoDeTarea(request: NextRequest): void {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) throw crearError('SECRETO_DE_TAREA_NO_CONFIGURADO');

  const encabezado = request.headers.get('authorization');
  if (encabezado !== `Bearer ${secreto}`) {
    throw crearError('SIN_PERMISO');
  }
}
