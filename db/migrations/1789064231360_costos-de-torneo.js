/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Costo de inscripción y de planilla/fecha (Hallazgo #5 del audit contra
 * el paquete de diseño): la ficha pública nunca mostraba cuánto cuesta
 * anotarse ni jugar cada fecha — de punta a punta no existía ni la
 * columna. Ambos opcionales y sin default: sin cargarlos, el torneo
 * aparece como sin costo.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('torneo', {
    costo_inscripcion: { type: 'numeric' },
    costo_planilla: { type: 'numeric' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('torneo', ['costo_inscripcion', 'costo_planilla']);
};
