/**
 * Agenda el recálculo del score deportivo, que nunca lo estuvo.
 *
 * La ruta `/api/tareas/recalcular-score` existía desde T26 y la fórmula
 * está completa, pero no había ningún `cron.schedule` para ella: el
 * único agendado era `confirmar-resultados-vencidos`. Resultado, en
 * producción `score_equipo` sólo se llenaba si alguien invocaba la ruta
 * a mano, así que el score del equipo, el ranking y la confiabilidad
 * mostraban lo que hubiera quedado de la última vez.
 *
 * **A las 4:20 UTC** (1:20 de la mañana en Argentina) y no en punto: a
 * esa hora no hay nadie cargando resultados, y el minuto 20 evita el
 * amontonamiento de tareas que arrancan en el minuto 0.
 *
 * Diaria y no horaria: el score mide desempeño con decaimiento por
 * antigüedad en una ventana de 24 meses. Entre una hora y la siguiente
 * no cambia nada que se note, y recalcular todos los equipos activos es
 * el trabajo más caro de la plataforma.
 *
 * Se agenda **después** de que el servicio tuviera lote y presupuesto
 * de tiempo, no antes: agendar primero habría sido programar el mismo
 * corte silencioso que ya pasó con la tarea horaria.
 *
 * Las tres cosas de siempre, cada una por un error real: host canónico
 * con `www` (sin él, libcurl descarta el header `Authorization` al
 * seguir la redirección y la tarea responde 403); el secreto de Vault
 * con `ORDER BY created_at DESC LIMIT 1`; y todo dentro del `IF EXISTS`
 * porque ni `pg_cron` ni Vault existen en el Postgres local ni en CI.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
         AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
        PERFORM cron.schedule(
          'recalcular-score',
          '20 4 * * *',
          $job$
          SELECT net.http_post(
            url := 'https://www.invicta.com.ar/api/tareas/recalcular-score',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || (
                SELECT decrypted_secret FROM vault.decrypted_secrets
                WHERE name = 'cron_secret'
                ORDER BY created_at DESC
                LIMIT 1
              ),
              'Content-Type', 'application/json'
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 65000
          );
          $job$
        );
      END IF;
    END
    $$;
  `);
};

/**
 * Desagenda. No borra `score_equipo`: los valores calculados siguen
 * ahí, sólo dejan de actualizarse.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('recalcular-score');
      END IF;
    END
    $$;
  `);
};
