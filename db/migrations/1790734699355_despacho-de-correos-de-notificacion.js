/**
 * Lo que le faltaba a `notificacion` para poder despachar el canal
 * `email` (`06`, D-53).
 *
 * Hasta acá la tabla registraba una fila por canal y ahí terminaba:
 * nadie mandaba los correos, y `estado` sólo distinguía
 * `pending | delivered | read`. Con eso no alcanza para un despacho
 * real, porque falta lo único que importa cuando un proveedor se cae:
 * **saber qué falló, cuántas veces y por qué**.
 *
 * - `failed` como cuarto estado. `delivered` sigue significando
 *   entregado, para los dos canales: no se inventa un `sent` paralelo.
 * - `intentos` para poder rendirse. Un correo a una casilla que no
 *   existe no mejora reintentando para siempre.
 * - `fecha_envio` y `ultimo_error` para poder mirar qué pasó sin
 *   adivinar.
 * - Un índice parcial sobre lo pendiente de email, que es lo único que
 *   la tarea de despacho consulta. Parcial y no total porque la
 *   inmensa mayoría de las filas son `in_app` ya leídas: indexarlas
 *   sería pagar por lo que nunca se busca.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE notificacion DROP CONSTRAINT IF EXISTS notificacion_estado_check;
    ALTER TABLE notificacion ADD CONSTRAINT notificacion_estado_check
      CHECK (estado IN ('pending', 'delivered', 'read', 'failed'));

    ALTER TABLE notificacion
      ADD COLUMN IF NOT EXISTS intentos smallint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fecha_envio timestamptz,
      ADD COLUMN IF NOT EXISTS ultimo_error text;

    CREATE INDEX IF NOT EXISTS notificacion_email_pendiente_idx
      ON notificacion (fecha_generacion)
      WHERE canal = 'email' AND estado IN ('pending', 'failed');
  `);
};

/**
 * Vuelve al estado anterior. Las filas que hayan quedado en `failed` se
 * llevan a `pending`: es el estado del que salieron y el único de los
 * tres viejos que no miente sobre ellas.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS notificacion_email_pendiente_idx;

    UPDATE notificacion SET estado = 'pending' WHERE estado = 'failed';

    ALTER TABLE notificacion DROP CONSTRAINT IF EXISTS notificacion_estado_check;
    ALTER TABLE notificacion ADD CONSTRAINT notificacion_estado_check
      CHECK (estado IN ('pending', 'delivered', 'read'));

    ALTER TABLE notificacion
      DROP COLUMN IF EXISTS intentos,
      DROP COLUMN IF EXISTS fecha_envio,
      DROP COLUMN IF EXISTS ultimo_error;
  `);
};
