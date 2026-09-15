/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * `FichaTorneo.imagenUrl` venía mostrando `organizacion_logo_url` (el
 * logo de la organización, no del torneo) porque nunca hubo una columna
 * propia — un torneo de una organización con varios torneos activos no
 * podía distinguirse por imagen. `imagen_url` es la portada real del
 * torneo, opcional, subida por quien lo organiza; mientras esté sin
 * cargar, la ficha sigue cayendo al logo
 * de la organización como hasta ahora.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('torneo', {
    imagen_url: { type: 'text' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('torneo', ['imagen_url']);
};
