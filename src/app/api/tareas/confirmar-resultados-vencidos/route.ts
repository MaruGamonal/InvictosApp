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

/**
 * El límite de la función, escrito y no heredado del valor por defecto
 * de la plataforma.
 *
 * Esta es la única ruta de la aplicación que hace trabajo por lote: el
 * resto responde a una persona que está mirando la pantalla y termina
 * en milisegundos. Dejarla en el valor por defecto la ataba a un
 * número que no elegimos nadie, y que la plataforma puede cambiar.
 *
 * El servicio corta solo a los 45 segundos, así que los 60 son el
 * techo duro, no el objetivo: el margen es para cerrar el check-in.
 */
export const maxDuration = 60;

/**
 * Sentry considera fallida la corrida si el aviso de fin no llega
 * dentro de este plazo. Estaba en 10 minutos, más de diez veces el
 * límite real de la función: una corrida que moría a los 60 segundos
 * se reportaba recién diez minutos después, ya empezada la siguiente.
 * Dos minutos dan aire de sobra y avisan a tiempo.
 */
const MINUTOS_DE_CORRIDA = 2;

/** Suficiente para un par de envíos chicos, y no tanto como para colgar la tarea. */
const MILISEGUNDOS_PARA_VACIAR = 2_000;

export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);

    try {
      const resumen = await Sentry.withMonitor(
        'confirmar-resultados-vencidos',
        () => confirmarResultadosVencidos(),
        {
          schedule: { type: 'crontab', value: '0 * * * *' },
          timezone: 'UTC',
          checkinMargin: 5,
          maxRuntime: MINUTOS_DE_CORRIDA,
        },
      );

      // Quedó trabajo sin hacer: la corrida siguiente lo toma, pero si
      // pasa seguido es que una hora ya no alcanza, y eso no se ve en
      // ningún lado salvo que se diga.
      if (resumen.pendientes > 0 || resumen.puedeHaberMas) {
        Sentry.captureMessage('La tarea horaria no llegó a confirmar todo lo vencido', {
          level: 'warning',
          extra: { ...resumen },
        });
      }

      return resumen;
    } finally {
      // **El check-in de cierre no se manda solo a tiempo.** Es un envío
      // en segundo plano, y la plataforma congela la instancia apenas se
      // devuelve la respuesta: lo que no salió, no sale. Sin esto, una
      // corrida que terminó bien puede quedar registrada como caída.
      //
      // Va en `finally` y no después del `await`: si la tarea falla,
      // `withMonitor` manda el check-in de error y relanza, y ese aviso
      // —el que más importa— es justamente el que se perdía.
      await Sentry.flush(MILISEGUNDOS_PARA_VACIAR);
    }
  });
}
