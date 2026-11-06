/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * El host al que le pegan las tareas deja de estar escrito en la
 * migración y pasa a salir del Vault, como ya salía el secreto.
 *
 * **Por qué.** `https://www.invicta.com.ar` estaba a fuego en el cuerpo
 * de los dos jobs. Mientras hubo una sola base daba igual; con un
 * ambiente de pruebas deja de darlo: ese Supabase corre **estas mismas
 * migraciones**, así que su `pg_cron` le dispararía a producción una vez
 * por hora, con el secreto de pruebas. Daría 403 —ruido, no daño— pero
 * es una base de prueba llamando al sitio real, que es exactamente lo
 * que un ambiente separado existe para evitar.
 *
 * Ahora cada base dice a dónde apunta, en un secreto `host_canonico`
 * del Vault. Es el mismo mecanismo y el mismo lugar que `cron_secret`:
 * una base, un secreto, una URL.
 *
 * **Sin el secreto, el job no sale a la red.** Nada de caer al host de
 * producción por defecto: ese "default razonable" es justo el que haría
 * que una base nueva le pegue al sitio real. El `WHERE EXISTS` del
 * cuerpo hace que la corrida no haga nada y no tire error, que es lo
 * correcto para una base que todavía no terminó de configurarse.
 *
 * **Producción no se entera.** La migración le crea el secreto sola, y
 * sólo a ella: se detecta mirando si la base ya tiene el job agendado
 * con el host viejo adentro. Eso sólo es cierto en la base que viene
 * corriendo con las migraciones anteriores. Una base nueva —el ambiente
 * de pruebas— no tiene ese job, así que no hereda la URL de producción
 * y hay que cargarle la suya, que es el punto.
 *
 * Para cargarlo a mano, en el SQL editor de ese proyecto:
 *   select vault.create_secret('https://pruebas.invicta.com.ar', 'host_canonico');
 *
 * Sin `www` y sin barra final: `pg_net` usa libcurl, y libcurl descarta
 * la cabecera `Authorization` al seguir una redirección que cambia de
 * host (la lección de `tarea-programada-al-host-canonico`). El valor
 * tiene que ser el host que responde, no uno que redirija.
 *
 * Igual que las anteriores, todo va dentro de un `IF EXISTS` porque
 * `pg_cron` y Vault no existen en el Postgres local ni en el de CI.
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

        -- Sólo en la base que ya venía apuntando a producción: es la
        -- forma de reconocerla sin preguntarle al entorno, que acá
        -- adentro no existe. Una base nueva no entra por acá.
        IF EXISTS (
          SELECT 1 FROM cron.job
          WHERE jobname IN ('confirmar-resultados-vencidos', 'recalcular-score')
            AND command LIKE '%www.invicta.com.ar%'
        ) AND NOT EXISTS (
          SELECT 1 FROM vault.decrypted_secrets WHERE name = 'host_canonico'
        ) THEN
          PERFORM vault.create_secret('https://www.invicta.com.ar', 'host_canonico');
        END IF;

        PERFORM cron.schedule(
          'confirmar-resultados-vencidos',
          '0 * * * *',
          $job$
          SELECT net.http_post(
            url := (
              SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'host_canonico'
              ORDER BY created_at DESC
              LIMIT 1
            ) || '/api/tareas/confirmar-resultados-vencidos',
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
          )
          WHERE EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'host_canonico');
          $job$
        );

        PERFORM cron.schedule(
          'recalcular-score',
          '20 4 * * *',
          $job$
          SELECT net.http_post(
            url := (
              SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'host_canonico'
              ORDER BY created_at DESC
              LIMIT 1
            ) || '/api/tareas/recalcular-score',
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
          )
          WHERE EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'host_canonico');
          $job$
        );
      END IF;
    END
    $$;
  `);
};

/**
 * Vuelve a los dos jobs con el host de producción escrito adentro. El
 * secreto `host_canonico` queda donde está: no estorba a nadie, y
 * borrarlo haría que un `up` posterior no pueda distinguir producción.
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
            timeout_milliseconds := 65000
          );
          $job$
        );

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
