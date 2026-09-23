/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T28 — alinea el plazo que `pg_net` espera con el que la función tiene
 * para correr.
 *
 * La tarea horaria se agendó con `timeout_milliseconds := 30000`, pero
 * la ruta declara ahora `maxDuration = 60`: el que llama dejaba de
 * esperar a la mitad del tiempo que el que responde tiene permitido.
 *
 * Eso tenía dos costos. Uno seguro: la respuesta no quedaba registrada
 * en `net._http_response`, así que desde la base no se podía saber si
 * la corrida había terminado bien — el único lugar donde mirar era
 * Sentry. El otro, posible: según cómo trate la plataforma la
 * desconexión del cliente, cortar a los 30 segundos puede abortar la
 * corrida en el medio, que es exactamente el síntoma que se estaba
 * investigando (el aviso de arranque llega, el de fin no).
 *
 * **Cambia solo el plazo.** El resto del job queda igual que en
 * `tarea-programada-al-host-canonico`, que es la última que lo tocó: el
 * host **con `www`** —sin él, libcurl descarta la cabecera
 * `Authorization` al seguir la redirección y la tarea vuelve a dar
 * 403— y el `ORDER BY created_at DESC` sobre `vault.decrypted_secrets`,
 * sin el cual el job elige cualquiera de los secretos cargados con ese
 * nombre. Reescribir el job entero en cada migración es cómodo y
 * peligroso: cualquier descuido acá deshace un arreglo anterior sin que
 * nada lo señale.
 *
 * Igual que las anteriores, va dentro de un `IF EXISTS` porque `pg_cron`
 * y Vault no existen en el Postgres local de desarrollo ni en el de CI.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
         AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
        PERFORM cron.schedule(
          'confirmar-resultados-vencidos',
          '0 * * * *',
          $job$
          SELECT net.http_post(
            url := 'https://www.invicta.com.ar/api/tareas/confirmar-resultados-vencidos',
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
 * Vuelve al plazo de 30 segundos, conservando el host canónico y el
 * orden del secreto. Deshace este cambio puntual, no desagenda la tarea.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
         AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
        PERFORM cron.schedule(
          'confirmar-resultados-vencidos',
          '0 * * * *',
          $job$
          SELECT net.http_post(
            url := 'https://www.invicta.com.ar/api/tareas/confirmar-resultados-vencidos',
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
            timeout_milliseconds := 30000
          );
          $job$
        );
      END IF;
    END
    $$;
  `);
};
