/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * La tarea horaria venía devolviendo 403 en cada corrida, y la causa no
 * era el secreto: apuntaba a `https://invicta.com.ar`, que redirige a
 * `https://www.invicta.com.ar`. `pg_net` usa libcurl, y libcurl
 * **descarta la cabecera `Authorization` al seguir una redirección que
 * cambia de host** — por seguridad, y sin avisar. El pedido llegaba a la
 * aplicación sin credencial, así que se rechazaba con "sin permiso", que
 * mandaba a buscar el problema al valor del secreto en vez de a la URL.
 *
 * Apuntar al host canónico evita la redirección y con eso la cabecera
 * sobrevive. Si el dominio canónico llegara a cambiar, esto hay que
 * cambiarlo acá: no alcanza con que la URL vieja siga respondiendo.
 *
 * De paso, el `LIMIT 1` sobre `vault.decrypted_secrets` no tenía orden.
 * `vault.create_secret` no pisa el valor anterior sino que agrega otro,
 * así que dos altas con el mismo nombre dejaban al job eligiendo
 * cualquiera de las dos. Con `ORDER BY created_at DESC` toma siempre el
 * último cargado.
 *
 * Igual que las migraciones anteriores de la tarea, todo va dentro de un
 * `IF EXISTS` porque `pg_cron` y Vault no existen en el Postgres local
 * de desarrollo ni en el de CI.
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
            timeout_milliseconds := 30000
          );
          $job$
        );
      END IF;
    END
    $$;
  `);
};

/**
 * Vuelve al host sin `www` (y al `LIMIT 1` sin orden), que es como
 * quedaba después de `secreto-de-cron-via-vault`. Deshace este cambio
 * puntual, no desagenda la tarea.
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
            url := 'https://invicta.com.ar/api/tareas/confirmar-resultados-vencidos',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || (
                SELECT decrypted_secret FROM vault.decrypted_secrets
                WHERE name = 'cron_secret'
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
