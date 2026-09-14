/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * UC-47 — Preferencias de notificación (diseño aprobado D11). Tabla de
 * "mute": la ausencia de fila es el default vigente hoy (`06`, D-53 —
 * accionables por los dos canales, informativas solo push/in_app); una
 * fila presente apaga ese canal puntual para ese usuario y esa
 * categoría. Así ningún usuario existente necesita backfill: todos
 * arrancan sin ninguna fila, es decir, con el comportamiento actual
 * exacto.
 *
 * `categoria` agrupa los ~16 `notificacion.tipo` en las seis que
 * expone la pantalla de Preferencias — no es 1 a 1 con `tipo`, es una
 * categoría más ancha pensada para que la lista de opciones quepa en
 * una pantalla sin abrumar (mapeo en
 * `src/services/notificaciones/preferencias.ts`).
 *
 * Las accionables (team_invitation, registration_status,
 * match_schedule) nunca pueden apagar el canal `in_app` — el diseño
 * lo dice explícito ("no se puede apagar del todo, solo elegir el
 * canal"): el CHECK lo hace imposible de guardar, no solo de mostrar.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE preferencia_notificacion (
      usuario_id uuid NOT NULL REFERENCES usuario(id),
      categoria text NOT NULL CHECK (
        categoria IN (
          'team_invitation', 'registration_status', 'match_schedule',
          'followed_results', 'tournament_started', 'tournament_finished'
        )
      ),
      canal text NOT NULL CHECK (canal IN ('in_app', 'email')),
      PRIMARY KEY (usuario_id, categoria, canal),
      CONSTRAINT preferencia_notificacion_accionable_in_app_check CHECK (
        NOT (
          categoria IN ('team_invitation', 'registration_status', 'match_schedule')
          AND canal = 'in_app'
        )
      )
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE preferencia_notificacion;`);
};
