/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T28 — corrige la migración anterior (`tarea-programada-via-pg-cron`):
 * el rol `postgres` de un proyecto de Supabase no puede correr
 * `ALTER DATABASE ... SET app.cron_secret` ni `ALTER ROLE ... SET`
 * (`ERROR 42501: permission denied to set parameter`) — no es
 * superusuario real, y Supabase reserva los parámetros personalizados.
 *
 * La alternativa que Supabase sostiene para exactamente este caso es
 * **Vault**: un secreto encriptado en la base, legible desde SQL por
 * nombre. Esta migración reagenda la misma tarea (mismo nombre de job,
 * `cron.schedule` la reemplaza) para que la cabecera `Authorization` la
 * arme leyendo `vault.decrypted_secrets` en vez de
 * `current_setting('app.cron_secret', true)`.
 *
 * El secreto en sí sigue sin vivir acá — se carga una sola vez, después
 * del despliegue, en el editor SQL de Supabase:
 * `select vault.create_secret('<el mismo valor que CRON_SECRET en
 * Vercel>', 'cron_secret');`
 *
 * Igual que la migración anterior, todo queda guardado con `IF EXISTS`
 * porque `pg_cron` y Vault (`supabase_vault`) no existen en el Postgres
 * local de desarrollo/CI.
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

/**
 * Vuelve a la versión anterior del job (leyendo `current_setting`), no
 * lo desagenda — `down` deshace este cambio puntual, no toda la tarea
 * horaria (eso lo hace el `down` de la migración anterior).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
          'confirmar-resultados-vencidos',
          '0 * * * *',
          $job$
          SELECT net.http_post(
            url := 'https://invicta.com.ar/api/tareas/confirmar-resultados-vencidos',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
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
