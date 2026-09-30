/**
 * Agenda la segunda tarea del producto: el despacho de los correos de
 * notificación que el envío inmediato no logró mandar.
 *
 * Cada diez minutos y no cada hora: un aviso accionable pierde valor
 * rápido, y esta tarea existe para los ratos en que el proveedor estaba
 * caído. Diez minutos de demora en el peor caso es aceptable; una hora
 * no.
 *
 * Tres cosas se copian de la tarea horaria **porque cada una tapa un
 * error real que ya pasó**:
 *
 * 1. `https://www.invicta.com.ar` **con `www`**. Sin el `www` el host
 *    redirige, y libcurl —el que hay abajo de `pg_net`— descarta el
 *    header `Authorization` al seguir una redirección: la tarea llegaba
 *    y respondía 403.
 * 2. El secreto de Vault con `ORDER BY created_at DESC LIMIT 1`. Sin
 *    eso, si alguna vez hay dos secretos con el mismo nombre, se toma
 *    cualquiera.
 * 3. Todo dentro de un `IF EXISTS`: ni `pg_cron` ni Vault existen en el
 *    Postgres local de desarrollo ni en el de CI, y sin esta guarda la
 *    migración rompe ahí.
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
          'despachar-correos',
          '*/10 * * * *',
          $job$
          SELECT net.http_post(
            url := 'https://www.invicta.com.ar/api/tareas/despachar-correos',
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
 * Desagenda la tarea. No toca las filas de `notificacion`: los correos
 * pendientes siguen pendientes, listos para cuando se vuelva a agendar.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('despachar-correos');
      END IF;
    END
    $$;
  `);
};
