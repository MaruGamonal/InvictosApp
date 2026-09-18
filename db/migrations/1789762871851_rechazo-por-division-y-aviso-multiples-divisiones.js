/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Revisión 17 — el rechazo por división equivocada (`06`, D-108) y el
 * aviso de equipo en dos divisiones (`06`, D-109).
 *
 * `wrong_division` se suma al CHECK existente de `motivo_estado`
 * (`04`, 4.15): es el único motivo que sirve para un `rejected` — el
 * `torneo_id` de la división sugerida viaja en el `motivo_estado_detalle`
 * ya existente, sin columna nueva (`10`, sección de `resolverInscripcion`).
 *
 * `advertencia_multiples_divisiones` es al certamen lo que
 * `advertencia_categoria` es a la categoría de género: avisa, no
 * bloquea, y se calcula al crear la inscripción (mismo criterio de
 * D-82).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.dropConstraint('inscripcion', 'inscripcion_motivo_estado_check');
  pgm.addConstraint('inscripcion', 'inscripcion_motivo_estado_check', {
    check:
      "motivo_estado IN ('withdrew', 'no_show', 'roster_incomplete', 'disciplinary', 'wrong_division', 'other')",
  });

  pgm.addColumns('inscripcion', {
    advertencia_multiples_divisiones: { type: 'boolean', notNull: true, default: false },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('inscripcion', ['advertencia_multiples_divisiones']);

  pgm.dropConstraint('inscripcion', 'inscripcion_motivo_estado_check');
  pgm.addConstraint('inscripcion', 'inscripcion_motivo_estado_check', {
    check: "motivo_estado IN ('withdrew', 'no_show', 'roster_incomplete', 'disciplinary', 'other')",
  });
};
