/**
 * Desagenda `despachar-correos`.
 *
 * El despacho quedó construido y probado, pero el correo de producto se
 * apaga por ahora: el único mail que sale de INVICTA es el de la cuenta
 * (confirmar el alta, recuperar la contraseña, verificar una
 * organización), y ese lo manda Supabase Auth sin pasar por la tarea.
 * El interruptor vive en `CORREO_DE_PRODUCTO_ACTIVO`, en
 * `services/notificaciones/tipos.ts`.
 *
 * Con el interruptor apagado no se registra ninguna fila de canal
 * `email`, así que la tarea correría 144 veces por día para no
 * encontrar nada: 144 invocaciones de función y 144 check-ins de Sentry
 * que siempre dicen cero. Un monitor que nunca cambia deja de mirarse,
 * y cuando el correo vuelva, ese hábito ya está perdido.
 *
 * **Para volver a prenderlo**: `CORREO_DE_PRODUCTO_ACTIVO = true` y el
 * `down` de esta migración, que reagenda la tarea exactamente como
 * estaba. No hay que reescribir nada.
 *
 * Las notificaciones de canal `email` que hayan quedado registradas
 * antes de este cambio no se tocan: siguen en `pending`, y el tope de
 * siete días de `despacharCorreosPendientes` se encarga de que, si el
 * correo vuelve mucho después, no salga un aviso viejo.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
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

/**
 * Vuelve a agendar la tarea, idéntica a como la dejó
 * `agendar-despacho-de-correos`: host canónico con `www` (sin él,
 * libcurl descarta el header `Authorization` al seguir la redirección),
 * el secreto de Vault más reciente, y todo dentro del `IF EXISTS`
 * porque ni `pg_cron` ni Vault existen en el Postgres local ni en CI.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
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
