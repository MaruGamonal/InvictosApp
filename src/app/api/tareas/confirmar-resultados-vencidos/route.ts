import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { confirmarResultadosVencidos } from '@/services/plataforma/confirmarResultadosVencidos';
import { verificarSecretoDeTarea } from '../_autenticacion';

/**
 * T26, `10` 6.1 — punto de entrada de la tarea horaria que agenda T28 vía
 * `pg_cron` + `pg_net` (ver la migración `tarea-programada-via-pg-cron`).
 *
 * El *check-in* de Sentry (T28, `09` sección 4) avisa cuando arranca y
 * cuando termina; como la tarea corre fuera del hosting, es la única
 * forma de enterarse de que dejó de llegar.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);
    return Sentry.withMonitor(
      'confirmar-resultados-vencidos',
      () => confirmarResultadosVencidos(),
      {
        schedule: { type: 'crontab', value: '0 * * * *' },
        timezone: 'UTC',
        checkinMargin: 5,
        maxRuntime: 10,
      },
    );
  });
}
