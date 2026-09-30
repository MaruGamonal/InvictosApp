import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { despacharCorreosPendientes } from '@/services/notificaciones/despacharCorreosPendientes';
import { verificarSecretoDeTarea } from '../_autenticacion';

/**
 * La mitad diferida del despacho de correos (`06`, D-53): recoge lo que
 * el envío inmediato de `notificar()` no logró mandar.
 *
 * Corre cada diez minutos y no cada hora: un aviso accionable —"cambió
 * el horario de tu partido", "confirmá el resultado"— pierde valor
 * rápido, y esta tarea existe justamente para los ratos en que el envío
 * inmediato no funcionó.
 *
 * Mismo andamiaje que la tarea horaria: secreto compartido, límite de
 * función escrito, check-in de Sentry y `flush` en `finally`.
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
      const resumen = await Sentry.withMonitor(
        'despachar-correos',
        () => despacharCorreosPendientes(),
        {
          schedule: { type: 'crontab', value: '*/10 * * * *' },
          timezone: 'UTC',
          checkinMargin: 5,
          maxRuntime: MINUTOS_DE_CORRIDA,
        },
      );

      // Si esto pasa seguido, diez minutos ya no alcanzan para la cola:
      // no se ve en ningún lado salvo que se diga.
      if (resumen.pendientes > 0 || resumen.puedeHaberMas) {
        Sentry.captureMessage('El despacho de correos no vació la cola', {
          level: 'warning',
          extra: { ...resumen },
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
