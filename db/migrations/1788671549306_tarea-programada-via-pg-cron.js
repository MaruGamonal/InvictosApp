/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T28 — Vercel Hobby solo permite cron diario; la tarea de `10` 6.1
 * (confirmar resultados vencidos) necesita frecuencia horaria. La
 * solución (`decisiones-infraestructura-T28.md`, D-96) es programarla
 * desde Postgres con `pg_cron` + `pg_net`, pegándole por HTTP al mismo
 * endpoint que ya usa T26 — así "la tarea programada ejecuta exactamente
 * el mismo código que un usuario", sin un segundo camino de lógica.
 *
 * Esto tiene que ser una migración versionada y no un clic en el panel
 * de Supabase (`pasos-infraestructura-T28.md`), para que quede en el
 * historial igual que cualquier otro cambio de esquema.
 *
 * `pg_cron` y `pg_net` solo existen en el Postgres de Supabase, no en el
 * Postgres local de desarrollo/CI. Cada paso está guardado con un `IF
 * EXISTS` sobre `pg_available_extensions`/`pg_extension`: PL/pgSQL recién
 * prepara una sentencia la primera vez que se ejecuta esa rama, así que
 * referenciar `cron.schedule`/`net.http_post` dentro de una rama que
 * nunca corre (porque la extensión no está) no rompe nada.
 *
 * El secreto compartido no vive acá: se carga una sola vez, después del
 * despliegue, corriendo en el editor SQL de Supabase
 * `ALTER DATABASE postgres SET app.cron_secret = '<el mismo valor que
 * CRON_SECRET en Vercel>';` — nunca commiteado. La tarea lo lee con
 * `current_setting('app.cron_secret', true)`.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
      END IF;
    END
    $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';
      END IF;
    END
    $$;
  `);

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

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('confirmar-resultados-vencidos');
      END IF;
    END
    $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        EXECUTE 'DROP EXTENSION IF EXISTS pg_net';
      END IF;
    END
    $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE 'DROP EXTENSION IF EXISTS pg_cron';
      END IF;
    END
    $$;
  `);
};
