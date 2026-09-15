/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Jugador del partido: quien cargó el resultado lo elige entre los
 * jugadores elegibles de ambos equipos
 * (`integrante_habilitado`, misma fuente que goleadores y tarjetas,
 * T30) — nunca de fuera de la lista de buena fe del torneo. Opcional:
 * un resultado puede cargarse sin elegirlo. `ON DELETE SET NULL` porque
 * la elección es un dato secundario del partido, no algo que deba
 * bloquear el borrado de un perfil.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('partido', {
    jugador_del_partido_perfil_id: {
      type: 'uuid',
      references: 'perfil_deportivo(id)',
      onDelete: 'SET NULL',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('partido', ['jugador_del_partido_perfil_id']);
};
