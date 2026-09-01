/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T9 — parámetros de torneo que T2 no había cubierto todavía porque sus
 * consumidores (T15, T16, T17) todavía no existían: quién carga
 * resultados (D-07b), qué pasa con los partidos pendientes de un equipo
 * que abandona (D-08b), el resultado configurado del walkover (D-33b) y
 * el cierre de incorporaciones a la lista de buena fe (D-30b).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE torneo
      ADD COLUMN solo_organizador_carga_resultados boolean NOT NULL DEFAULT false,
      ADD COLUMN partidos_pendientes_por_abandono text NOT NULL DEFAULT 'ganados_por_rival'
        CHECK (partidos_pendientes_por_abandono IN ('ganados_por_rival', 'anulados')),
      ADD COLUMN goles_walkover_ganador integer NOT NULL DEFAULT 3,
      ADD COLUMN goles_walkover_perdedor integer NOT NULL DEFAULT 0,
      ADD COLUMN fecha_cierre_lista_buena_fe timestamptz;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE torneo
      DROP COLUMN solo_organizador_carga_resultados,
      DROP COLUMN partidos_pendientes_por_abandono,
      DROP COLUMN goles_walkover_ganador,
      DROP COLUMN goles_walkover_perdedor,
      DROP COLUMN fecha_cierre_lista_buena_fe;
  `);
};
