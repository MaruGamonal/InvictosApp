import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { recalcularScore } from '@/services/plataforma/recalcularScore';
import { verificarSecretoDeTarea } from '../_autenticacion';

/**
 * T26, `10` 6.3 — el recálculo diario del score deportivo.
 *
 * El comentario que había acá decía "declarada y agendada (diaria),
 * todavía sin fórmula", y era al revés en las dos mitades: la fórmula
 * está completa desde hace tiempo en `recalcularScore.ts`, y la tarea
 * **no estaba agendada en ningún lado** — la ruta existía y nada la
 * llamaba, así que `score_equipo` sólo se llenaba si alguien la
 * invocaba a mano. La migración `agendar-recalculo-de-score` la agenda.
 */

/** El servicio corta solo a los 45 segundos; los 60 son el techo duro. */
export const maxDuration = 60;

/** Sentry da por caída la corrida si el cierre no llega en este plazo. */
const MINUTOS_DE_CORRIDA = 2;

/** Suficiente para un par de envíos chicos, y no tanto como para colgar la tarea. */
const MILISEGUNDOS_PARA_VACIAR = 2_000;

export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);

    try {
      const resumen = await Sentry.withMonitor('recalcular-score', () => recalcularScore(), {
        schedule: { type: 'crontab', value: '20 4 * * *' },
        timezone: 'UTC',
        checkinMargin: 10,
        maxRuntime: MINUTOS_DE_CORRIDA,
      });

      // El lote rota, así que quedar corto una noche no pierde a nadie
      // — pero si pasa todas las noches, un día ya no alcanza y eso no
      // se ve en ningún lado salvo que se diga.
      if (resumen.pendientes > 0 || resumen.puedeHaberMas) {
        Sentry.captureMessage('El recálculo de score no llegó a todos los equipos', {
          level: 'warning',
          extra: { ...resumen, fallidos: resumen.fallidos.length },
        });
      }

      return resumen;
    } finally {
      // Sin esto, la instancia se congela al devolver la respuesta y el
      // check-in de cierre no llega: una corrida sana queda registrada
      // como caída. En `finally` para que el aviso de error tampoco se
      // pierda.
      await Sentry.flush(MILISEGUNDOS_PARA_VACIAR);
    }
  });
}
