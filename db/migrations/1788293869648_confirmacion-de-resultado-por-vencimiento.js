/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T26 — La tarea horaria de confirmación de resultados vencidos (`10`,
 * 6.1) marca **cómo** quedó firme un resultado: por vencimiento del
 * plazo de 72 horas, no porque alguien lo haya confirmado. Ante un
 * reclamo son dos informaciones distintas (`05`, sección 5), y sin esta
 * columna no habría dónde guardar la diferencia.
 *
 * `fecha_confirmacion_resultado` ya existía desde T2 pero nada la
 * escribía todavía — la tarea la usa junto con esta columna nueva.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE partido ADD COLUMN confirmado_por_vencimiento boolean NOT NULL DEFAULT false;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE partido DROP COLUMN confirmado_por_vencimiento;
  `);
};
