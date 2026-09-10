/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Reportado en vivo: "la ubicación que coloco debe ser una ubicación
 * reconocida por el maps para que pueda direccionar correctamente" — con
 * `direccion` como texto libre, el mapa de la ficha (`torneo/[id]/page.tsx`)
 * tiene que re-geocodificarla cada vez que alguien la mira, y nada impide
 * cargar algo que Maps no sepa ubicar. `latitud`/`longitud` guardan el
 * resultado de Google Places Autocomplete en el momento en que se elige la
 * dirección — ya resuelto, exacto, sin volver a adivinar — y quedan
 * opcionales porque `direccion` sigue siendo texto libre para quien no
 * tiene la integración de Maps disponible (D-52: nada de esto bloquea).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('torneo', {
    latitud: { type: 'double precision' },
    longitud: { type: 'double precision' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('torneo', ['latitud', 'longitud']);
};
